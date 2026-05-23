import type { StateCreator } from "zustand"
import type { RivoState, TransactionsSlice } from "./types"
import type { Transaction } from "@/types/transaction"
import { formatIQD } from "@/lib/currency"
import { supabase, mapDbInvoice } from "@/lib/supabase"
import type { DbInvoice, DbInvoiceItem } from "@/lib/supabase"
import { logAudit } from "@/lib/audit"
import { PERM } from "@/lib/auth/permission-keys"

const LOW_STOCK_THRESHOLD = 5

type InvoiceWithItems = DbInvoice & { invoice_items: DbInvoiceItem[] }

export const createTransactionsSlice: StateCreator<RivoState, [], [], TransactionsSlice> = (set, get) => ({
  transactions: [],
  _nextInvoiceNum: 1,

  loadTransactions: async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, invoice_items(*)")
      .order("created_at", { ascending: false })
    if (error) { console.error("loadTransactions:", error); return }

    const rows = (data ?? []) as InvoiceWithItems[]
    const transactions = rows.map((row) => mapDbInvoice(row, row.invoice_items ?? []))

    let nextNum = 1
    for (const tx of transactions) {
      const match = tx.id.match(/^INV-(\d+)$/)
      if (match) {
        const n = parseInt(match[1], 10)
        if (n >= nextNum) nextNum = n + 1
      }
    }

    set({ transactions, _nextInvoiceNum: nextNum })
  },

  commitTransaction: async (transaction: Transaction, stockDeductions, clientId?) => {
    if (!get().canDo(PERM.CREATE_INVOICE)) {
      console.warn("[rbac] commitTransaction denied — missing CREATE_INVOICE")
      return { success: false, error: "غير مصرح" }
    }

    const lowStockAlerts: Array<{ name: string; stock: number; kind: "product" | "minibar" }> = []

    // ── STEP 1: INSERT invoice header ──────────────────────────────────────────
    const { data: invoiceRow, error: invoiceErr } = await supabase
      .from("invoices")
      .insert({
        invoice_number: transaction.id,
        barber_id: transaction.barberId ?? null,
        barber_name: transaction.barberName || null,
        created_by: get().currentSession?.userId ?? null,
        client_name: transaction.clientName,
        subtotal: transaction.subtotal,
        discount_type: transaction.discountType,
        discount_value: transaction.discountValue,
        discount_amount: transaction.discountAmount,
        tax_enabled: transaction.taxEnabled,
        tax_rate: transaction.taxRate,
        tax_amount: transaction.taxAmount,
        total: transaction.total,
        payment_method: transaction.paymentMethod,
        barber_commission_pct: transaction.barberCommissionPct,
        barber_commission_amount: transaction.barberCommissionAmount,
        sale_type: transaction.saleType ?? null,
        notes: transaction.notes ?? null,
        status: "completed",
      })
      .select()
      .single()

    if (invoiceErr) {
      console.error("commitTransaction invoice:", invoiceErr)
      return { success: false, error: invoiceErr.message }
    }

    // ── STEP 2: INSERT invoice items ───────────────────────────────────────────
    const { error: itemsErr } = await supabase
      .from("invoice_items")
      .insert(
        transaction.items.map((item) => ({
          invoice_id: invoiceRow.id,
          item_type: item.type,
          item_id: item.itemId,
          name: item.name,
          price: item.price,
          buy_price: item.buyPrice ?? null,
          quantity: item.quantity,
          subtotal: item.subtotal,
        }))
      )

    if (itemsErr) {
      // Rollback: delete the orphaned invoice header
      await supabase.from("invoices").delete().eq("id", invoiceRow.id)
      console.error("commitTransaction items:", itemsErr)
      return { success: false, error: itemsErr.message }
    }

    // ── STEP 3: INSERT inventory_movements (blocking — rollback on failure) ─────
    // Stock snapshot is read NOW, before the local state deduction in Step 4.
    if (stockDeductions.length > 0) {
      const movementRows = stockDeductions.map((d) => {
        const item = d.kind === "product"
          ? get().products.find((p) => p.id === d.id)
          : get().minibarItems.find((m) => m.id === d.id)
        const prevQty = item?.stock ?? 0
        return {
          item_type: d.kind,
          item_id: d.id,
          item_name: item?.name ?? "",
          movement_type: "sale",
          quantity: d.quantity,
          previous_quantity: prevQty,
          new_quantity: Math.max(0, prevQty - d.quantity),
          invoice_id: invoiceRow.id,
          performed_by: get().currentSession?.userId ?? null,
        }
      })
      const { error: movErr } = await supabase
        .from("inventory_movements")
        .insert(movementRows)
      if (movErr) {
        await supabase.from("invoice_items").delete().eq("invoice_id", invoiceRow.id)
        await supabase.from("invoices").delete().eq("id", invoiceRow.id)
        console.error("commitTransaction movements:", movErr)
        return { success: false, error: movErr.message }
      }
    }

    // ── STEP 4: Optimistic local state update ──────────────────────────────────
    set((s) => {
      let products = s.products
      let minibarItems = s.minibarItems

      for (const d of stockDeductions) {
        if (d.kind === "product") {
          products = products.map((p) => {
            if (p.id !== d.id) return p
            const newStock = Math.max(0, p.stock - d.quantity)
            if (newStock <= LOW_STOCK_THRESHOLD && p.stock > LOW_STOCK_THRESHOLD) {
              lowStockAlerts.push({ name: p.name, stock: newStock, kind: "product" })
            }
            return { ...p, stock: newStock }
          })
        } else {
          minibarItems = minibarItems.map((m) => {
            if (m.id !== d.id) return m
            const newStock = Math.max(0, m.stock - d.quantity)
            if (newStock <= LOW_STOCK_THRESHOLD && m.stock > LOW_STOCK_THRESHOLD) {
              lowStockAlerts.push({ name: m.name, stock: newStock, kind: "minibar" })
            }
            return { ...m, stock: newStock }
          })
        }
      }

      const clients = clientId
        ? s.clients.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  visitsCount: c.visitsCount + 1,
                  totalSpent: c.totalSpent + transaction.total,
                  lastVisit: transaction.createdAt,
                }
              : c
          )
        : s.clients

      return {
        products,
        minibarItems,
        clients,
        transactions: [...s.transactions, { ...transaction, status: "completed" as const }],
        _nextInvoiceNum: s._nextInvoiceNum + 1,
      }
    })

    // ── STEP 5: Fire-and-forget stock sync to Supabase ─────────────────────────
    const productDeductions = stockDeductions.filter((d) => d.kind === "product")
    const minibarDeductions = stockDeductions.filter((d) => d.kind === "minibar")
    if (productDeductions.length > 0) {
      const updatedProducts = get().products
      ;(async () => {
        for (const d of productDeductions) {
          const p = updatedProducts.find((pr) => pr.id === d.id)
          if (p) await supabase.from("products").update({ quantity: p.stock }).eq("id", d.id)
        }
      })()
    }
    if (minibarDeductions.length > 0) {
      const updatedMinibar = get().minibarItems
      ;(async () => {
        for (const d of minibarDeductions) {
          const m = updatedMinibar.find((mi) => mi.id === d.id)
          if (m) await supabase.from("minibar").update({ quantity: m.stock }).eq("id", d.id)
        }
      })()
    }

    // Fire-and-forget: sync customer stats to Supabase after sale
    if (clientId) {
      const updatedClient = get().clients.find((c) => c.id === clientId)
      if (updatedClient) {
        ;(async () => {
          await supabase
            .from("customers")
            .update({
              visits_count: updatedClient.visitsCount,
              total_spent: updatedClient.totalSpent,
              last_visit: updatedClient.lastVisit ?? null,
            })
            .eq("id", clientId)
        })()
      }
    }

    get().addNotification({
      type: "sale",
      title: "عملية بيع جديدة",
      message: `${transaction.barberName} — ${formatIQD(transaction.total)}`,
    })

    for (const item of lowStockAlerts) {
      const title = "تنبيه مخزون ⚠️"
      const message = item.kind === "product"
        ? `المنتج ${item.name} أوشك على النفاذ`
        : `منتج الميني بار ${item.name} أوشك على النفاذ`
      get().broadcastNotification(title, message)
    }

    logAudit({
      actionType: "CREATE",
      entityType: "invoice",
      entityId: invoiceRow.id,
      entityName: transaction.id,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: {
        invoice_number: transaction.id,
        total: transaction.total,
        items_count: transaction.items.length,
        payment_method: transaction.paymentMethod,
        barber_name: transaction.barberName ?? null,
        sale_type: transaction.saleType ?? null,
      },
    })

    return { success: true }
  },

  returnTransaction: async (id) => {
    const session = get().currentSession
    if (!session || !get().canDo(PERM.REFUND_INVOICE)) {
      console.warn("[rbac] returnTransaction denied", { invoiceId: id, role: session?.role })
      return { success: false, error: "غير مصرح" }
    }

    const preTx = get().transactions.find((t) => t.id === id)
    if (!preTx)
      return { success: false, error: "الفاتورة غير موجودة" }
    if ((preTx.status ?? "completed") === "returned")
      return { success: false, error: "تم إرجاع هذه الفاتورة مسبقاً" }

    const now = new Date().toISOString()

    const { data: updatedRow, error: updateErr } = await supabase
      .from("invoices")
      .update({
        status: "returned",
        returned_at: now,
        returned_by: session.userId,
      })
      .eq("invoice_number", id)
      .select("id")
      .single()

    if (updateErr) {
      console.error("returnTransaction:", updateErr)
      return { success: false, error: updateErr.message }
    }

    // ── Return movements (best-effort — invoice status already committed) ───────
    // Stock snapshot is read before set() so previous_quantity is the pre-restore value.
    const returnableItems = preTx.items.filter(
      (item) => item.type === "product" || item.type === "minibar"
    )
    if (returnableItems.length > 0) {
      const movementRows = returnableItems.map((item) => {
        const prevQty =
          item.type === "product"
            ? (get().products.find((p) => p.id === item.itemId)?.stock ?? 0)
            : (get().minibarItems.find((m) => m.id === item.itemId)?.stock ?? 0)
        return {
          item_type: item.type,
          item_id: item.itemId,
          item_name: item.name,
          movement_type: "return",
          quantity: item.quantity,
          previous_quantity: prevQty,
          new_quantity: prevQty + item.quantity,
          invoice_id: updatedRow?.id ?? null,
          performed_by: session.userId,
          notes: `مرتجع مبيعات للفاتورة رقم ${id}`,
        }
      })
      const { error: movErr } = await supabase
        .from("inventory_movements")
        .insert(movementRows)
      if (movErr) console.error("returnTransaction movements:", movErr)
    }

    set((s) => {
      const tx = s.transactions.find((t) => t.id === id)
      if (!tx) return {}

      let products = s.products
      let minibarItems = s.minibarItems

      for (const item of tx.items) {
        if (item.type === "product") {
          products = products.map((p) =>
            p.id === item.itemId ? { ...p, stock: p.stock + item.quantity } : p
          )
        } else if (item.type === "minibar") {
          minibarItems = minibarItems.map((m) =>
            m.id === item.itemId ? { ...m, stock: m.stock + item.quantity } : m
          )
        }
      }

      const transactions = s.transactions.map((t) =>
        t.id === id
          ? { ...t, status: "returned" as const, returnedAt: now, returnedBy: session.userId }
          : t
      )

      return { products, minibarItems, transactions }
    })

    // Fire-and-forget: sync restored stock quantities to Supabase
    const returnedTx = get().transactions.find((t) => t.id === id)
    if (returnedTx) {
      const updatedProducts = get().products
      const updatedMinibar = get().minibarItems
      ;(async () => {
        for (const item of returnedTx.items) {
          if (item.type === "product") {
            const p = updatedProducts.find((pr) => pr.id === item.itemId)
            if (p) await supabase.from("products").update({ quantity: p.stock }).eq("id", item.itemId)
          } else if (item.type === "minibar") {
            const m = updatedMinibar.find((mi) => mi.id === item.itemId)
            if (m) await supabase.from("minibar").update({ quantity: m.stock }).eq("id", item.itemId)
          }
        }
      })()
    }

    get().broadcastNotification("استرجاع فاتورة ⚠️", `تم استرجاع الفاتورة رقم: ${id}`)

    logAudit({
      actionType: "RETURN",
      entityType: "invoice",
      entityId: updatedRow?.id ?? "",
      entityName: id,
      performedBy: session.userId,
      performerName: session.name,
      details: {
        invoice_number: id,
        total: preTx.total,
        returned_at: now,
      },
    })

    return { success: true }
  },

  deleteTransaction: async (id) => {
    if (!get().canDo(PERM.DELETE_INVOICE)) {
      console.warn("[rbac] deleteTransaction denied", { invoiceId: id, role: get().currentSession?.role })
      return
    }

    const { data: inv } = await supabase
      .from("invoices")
      .select("id")
      .eq("invoice_number", id)
      .single()

    if (inv) {
      await supabase.from("invoice_items").delete().eq("invoice_id", inv.id)
      const { error } = await supabase.from("invoices").delete().eq("id", inv.id)
      if (error) { console.error("deleteTransaction:", error); return }
      logAudit({
        actionType: "DELETE",
        entityType: "invoice",
        entityId: inv.id,
        entityName: id,
        performedBy: get().currentSession?.userId ?? null,
        performerName: get().currentSession?.name ?? null,
        details: { invoice_number: id },
      })
    }

    set((s) => ({ transactions: s.transactions.filter((tx) => tx.id !== id) }))
    get().broadcastNotification("حذف فاتورة ❌", `تم حذف الفاتورة رقم: ${id}`)
  },
})
