import type { StateCreator } from "zustand"
import type { RivoState, ProductsSlice } from "./types"
import type { InventoryFormValues } from "@/types/inventory"
import { supabase, mapDbProduct } from "@/lib/supabase"
import { logAudit } from "@/lib/audit"
import { PERM } from "@/lib/auth/permission-keys"

export const createProductsSlice: StateCreator<RivoState, [], [], ProductsSlice> = (set, get) => ({
  products: [],

  loadProducts: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) { console.error("loadProducts:", error); return }
    set({ products: (data ?? []).map(mapDbProduct) })
  },

  addProduct: async (data: InventoryFormValues) => {
    if (!get().canDo(PERM.MANAGE_INVENTORY))
      return { success: false, error: "غير مصرح" }

    const { data: inserted, error } = await supabase
      .from("products")
      .insert({
        name: data.name,
        cost_price: data.buyPrice,
        sale_price: data.sellPrice,
        quantity: Math.max(0, data.stock),
        minimum_stock: data.lowStockThreshold ?? null,
        image_url: data.imageUrl ?? null,
        is_active: data.status !== "archived",
        is_archived: data.status === "archived",
      })
      .select()
      .single()
    if (error) return { success: false, error: error.message }

    const initialStock = Math.max(0, data.stock)
    if (initialStock > 0) {
      // Log initial stock as stock_in (best-effort — item already created)
      const { error: movErr } = await supabase.from("inventory_movements").insert({
        item_type: "product",
        item_id: inserted.id,
        item_name: data.name,
        movement_type: "stock_in",
        quantity: initialStock,
        previous_quantity: 0,
        new_quantity: initialStock,
        performed_by: get().currentSession?.userId ?? null,
      })
      if (movErr) console.error("addProduct movements:", movErr)
    }

    set((s) => ({ products: [mapDbProduct(inserted), ...s.products] }))
    logAudit({
      actionType: "CREATE",
      entityType: "product",
      entityId: inserted.id,
      entityName: data.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { buyPrice: data.buyPrice, sellPrice: data.sellPrice, stock: initialStock },
    })
    return { success: true }
  },

  updateProduct: async (id, data: InventoryFormValues) => {
    if (!get().canDo(PERM.MANAGE_INVENTORY))
      return { success: false, error: "غير مصرح" }

    const prevStock = get().products.find((p) => p.id === id)?.stock ?? 0
    const newStock = Math.max(0, data.stock)

    // Movement-first: if logging fails, abort before touching stock
    if (prevStock !== newStock) {
      const { error: movErr } = await supabase.from("inventory_movements").insert({
        item_type: "product",
        item_id: id,
        item_name: data.name,
        movement_type: newStock > prevStock ? "stock_in" : "adjustment",
        quantity: Math.abs(newStock - prevStock),
        previous_quantity: prevStock,
        new_quantity: newStock,
        performed_by: get().currentSession?.userId ?? null,
      })
      if (movErr) return { success: false, error: movErr.message }
    }

    const { error } = await supabase
      .from("products")
      .update({
        name: data.name,
        cost_price: data.buyPrice,
        sale_price: data.sellPrice,
        quantity: newStock,
        minimum_stock: data.lowStockThreshold ?? null,
        image_url: data.imageUrl ?? null,
        is_active: data.status !== "archived",
        is_archived: data.status === "archived",
      })
      .eq("id", id)
    if (error) return { success: false, error: error.message }
    set((s) => ({
      products: s.products.map((p) =>
        p.id === id
          ? { ...p, ...data, stock: newStock, lowStockThreshold: data.lowStockThreshold ?? undefined }
          : p
      ),
    }))

    const threshold = data.lowStockThreshold ?? 5
    if (newStock <= threshold && prevStock > threshold) {
      get().broadcastNotification("تنبيه مخزون ⚠️", `المنتج ${data.name} أوشك على النفاذ`)
    }

    logAudit({
      actionType: "UPDATE",
      entityType: "product",
      entityId: id,
      entityName: data.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { prevStock, newStock, buyPrice: data.buyPrice, sellPrice: data.sellPrice, status: data.status },
    })
    return { success: true }
  },

  toggleArchiveProduct: async (id) => {
    if (!get().canDo(PERM.MANAGE_INVENTORY)) return

    const product = get().products.find((p) => p.id === id)
    if (!product) return
    const archiving = product.status !== "archived"
    const { error } = await supabase
      .from("products")
      .update({ is_archived: archiving, is_active: !archiving })
      .eq("id", id)
    if (error) { console.error("toggleArchiveProduct:", error); return }
    set((s) => ({
      products: s.products.map((p) =>
        p.id === id ? { ...p, status: archiving ? "archived" : "active" } : p
      ),
    }))
    logAudit({
      actionType: "ARCHIVE",
      entityType: "product",
      entityId: id,
      entityName: product.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { archived: archiving },
    })
  },

  deleteProduct: async (id) => {
    if (!get().canDo(PERM.MANAGE_INVENTORY)) return

    const product = get().products.find((p) => p.id === id)
    const { error } = await supabase.from("products").delete().eq("id", id)
    if (error) { console.error("deleteProduct:", error); return }
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
    logAudit({
      actionType: "DELETE",
      entityType: "product",
      entityId: id,
      entityName: product?.name ?? "",
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
    })
  },
})
