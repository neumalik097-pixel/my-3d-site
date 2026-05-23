import type { StateCreator } from "zustand"
import type { RivoState, MinibarSlice } from "./types"
import type { InventoryFormValues } from "@/types/inventory"
import { supabase, mapDbMinibarItem } from "@/lib/supabase"
import { logAudit } from "@/lib/audit"
import { PERM } from "@/lib/auth/permission-keys"

export const createMinibarSlice: StateCreator<RivoState, [], [], MinibarSlice> = (set, get) => ({
  minibarItems: [],

  loadMinibarItems: async () => {
    const { data, error } = await supabase
      .from("minibar")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) { console.error("loadMinibarItems:", error); return }
    set({ minibarItems: (data ?? []).map(mapDbMinibarItem) })
  },

  addMinibarItem: async (data: InventoryFormValues) => {
    if (!get().canDo(PERM.MANAGE_INVENTORY))
      return { success: false, error: "غير مصرح" }

    const { data: inserted, error } = await supabase
      .from("minibar")
      .insert({
        name: data.name,
        cost_price: data.buyPrice,
        sale_price: data.sellPrice,
        quantity: Math.max(0, data.stock),
        minimum_stock: data.lowStockThreshold ?? null,
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
        item_type: "minibar",
        item_id: inserted.id,
        item_name: data.name,
        movement_type: "stock_in",
        quantity: initialStock,
        previous_quantity: 0,
        new_quantity: initialStock,
        performed_by: get().currentSession?.userId ?? null,
      })
      if (movErr) console.error("addMinibarItem movements:", movErr)
    }

    set((s) => ({ minibarItems: [mapDbMinibarItem(inserted), ...s.minibarItems] }))
    logAudit({
      actionType: "CREATE",
      entityType: "minibar",
      entityId: inserted.id,
      entityName: data.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { buyPrice: data.buyPrice, sellPrice: data.sellPrice, stock: initialStock },
    })
    return { success: true }
  },

  updateMinibarItem: async (id, data: InventoryFormValues) => {
    if (!get().canDo(PERM.MANAGE_INVENTORY))
      return { success: false, error: "غير مصرح" }

    const prevStock = get().minibarItems.find((m) => m.id === id)?.stock ?? 0
    const newStock = Math.max(0, data.stock)

    // Movement-first: if logging fails, abort before touching stock
    if (prevStock !== newStock) {
      const { error: movErr } = await supabase.from("inventory_movements").insert({
        item_type: "minibar",
        item_id: id,
        item_name: data.name,
        movement_type: newStock > prevStock ? "restock" : "adjustment",
        quantity: Math.abs(newStock - prevStock),
        previous_quantity: prevStock,
        new_quantity: newStock,
        performed_by: get().currentSession?.userId ?? null,
      })
      if (movErr) return { success: false, error: movErr.message }
    }

    const { error } = await supabase
      .from("minibar")
      .update({
        name: data.name,
        cost_price: data.buyPrice,
        sale_price: data.sellPrice,
        quantity: newStock,
        minimum_stock: data.lowStockThreshold ?? null,
        is_active: data.status !== "archived",
        is_archived: data.status === "archived",
      })
      .eq("id", id)
    if (error) return { success: false, error: error.message }
    set((s) => ({
      minibarItems: s.minibarItems.map((m) =>
        m.id === id
          ? { ...m, ...data, stock: newStock, lowStockThreshold: data.lowStockThreshold ?? undefined }
          : m
      ),
    }))

    const threshold = data.lowStockThreshold ?? 5
    if (newStock <= threshold && prevStock > threshold) {
      get().broadcastNotification("تنبيه مخزون ⚠️", `منتج الميني بار ${data.name} أوشك على النفاذ`)
    }

    logAudit({
      actionType: "UPDATE",
      entityType: "minibar",
      entityId: id,
      entityName: data.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { prevStock, newStock, buyPrice: data.buyPrice, sellPrice: data.sellPrice, status: data.status },
    })
    return { success: true }
  },

  toggleArchiveMinibarItem: async (id) => {
    if (!get().canDo(PERM.MANAGE_INVENTORY)) return

    const item = get().minibarItems.find((m) => m.id === id)
    if (!item) return
    const archiving = item.status !== "archived"
    const { error } = await supabase
      .from("minibar")
      .update({ is_archived: archiving, is_active: !archiving })
      .eq("id", id)
    if (error) { console.error("toggleArchiveMinibarItem:", error); return }
    set((s) => ({
      minibarItems: s.minibarItems.map((m) =>
        m.id === id ? { ...m, status: archiving ? "archived" : "active" } : m
      ),
    }))
    logAudit({
      actionType: "ARCHIVE",
      entityType: "minibar",
      entityId: id,
      entityName: item.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { archived: archiving },
    })
  },

  deleteMinibarItem: async (id) => {
    if (!get().canDo(PERM.MANAGE_INVENTORY)) return

    const item = get().minibarItems.find((m) => m.id === id)
    const { error } = await supabase.from("minibar").delete().eq("id", id)
    if (error) { console.error("deleteMinibarItem:", error); return }
    set((s) => ({ minibarItems: s.minibarItems.filter((m) => m.id !== id) }))
    logAudit({
      actionType: "DELETE",
      entityType: "minibar",
      entityId: id,
      entityName: item?.name ?? "",
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
    })
  },
})
