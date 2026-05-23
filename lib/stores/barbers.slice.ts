import type { StateCreator } from "zustand"
import type { RivoState, BarbersSlice } from "./types"
import type { BarberFormValues } from "@/types/barber"
import { supabase, mapDbBarber } from "@/lib/supabase"
import { logAudit } from "@/lib/audit"
import { PERM } from "@/lib/auth/permission-keys"

export const createBarbersSlice: StateCreator<RivoState, [], [], BarbersSlice> = (set, get) => ({
  barbers: [],

  loadBarbers: async () => {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .order("created_at", { ascending: true })
    if (error) { console.error("loadBarbers:", error); return }
    set({ barbers: (data ?? []).map(mapDbBarber) })
  },

  addBarber: async (data: BarberFormValues) => {
    if (!get().canDo(PERM.MANAGE_BARBERS))
      return { success: false, error: "غير مصرح" }

    const { data: inserted, error } = await supabase
      .from("barbers")
      .insert({
        name: data.name,
        phone: data.phone || null,
        commission_percentage: data.commissionPct,
        is_active: data.status !== "archived",
        role: "barber",
      })
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    set((s) => ({ barbers: [...s.barbers, mapDbBarber(inserted)] }))
    logAudit({
      actionType: "CREATE",
      entityType: "barber",
      entityId: inserted.id,
      entityName: data.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { commissionPct: data.commissionPct, phone: data.phone || null },
    })
    return { success: true }
  },

  updateBarber: async (id, data: BarberFormValues) => {
    if (!get().canDo(PERM.MANAGE_BARBERS))
      return { success: false, error: "غير مصرح" }

    const { error } = await supabase
      .from("barbers")
      .update({
        name: data.name,
        phone: data.phone || null,
        commission_percentage: data.commissionPct,
        is_active: data.status !== "archived",
      })
      .eq("id", id)
    if (error) return { success: false, error: error.message }
    set((s) => ({
      barbers: s.barbers.map((b) => (b.id === id ? { ...b, ...data } : b)),
    }))
    logAudit({
      actionType: "UPDATE",
      entityType: "barber",
      entityId: id,
      entityName: data.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { commissionPct: data.commissionPct, status: data.status },
    })
    return { success: true }
  },

  toggleArchiveBarber: async (id) => {
    if (!get().canDo(PERM.MANAGE_BARBERS)) return

    const barber = get().barbers.find((b) => b.id === id)
    if (!barber) return
    const newIsActive = barber.status === "archived"
    const newStatus = newIsActive ? "active" : "archived"
    const { error } = await supabase
      .from("barbers")
      .update({ is_active: newIsActive })
      .eq("id", id)
    if (error) { console.error("toggleArchiveBarber:", error); return }
    set((s) => ({
      barbers: s.barbers.map((b) => (b.id === id ? { ...b, status: newStatus } : b)),
    }))
    logAudit({
      actionType: "ARCHIVE",
      entityType: "barber",
      entityId: id,
      entityName: barber.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { archived: !newIsActive },
    })
  },

  deleteBarber: async (id) => {
    if (!get().canDo(PERM.MANAGE_BARBERS)) return

    const barber = get().barbers.find((b) => b.id === id)
    const { error } = await supabase.from("barbers").delete().eq("id", id)
    if (error) { console.error("deleteBarber:", error); return }
    set((s) => ({ barbers: s.barbers.filter((b) => b.id !== id) }))
    logAudit({
      actionType: "DELETE",
      entityType: "barber",
      entityId: id,
      entityName: barber?.name ?? "",
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
    })
  },
})
