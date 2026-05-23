import type { StateCreator } from "zustand"
import type { RivoState, ServicesSlice } from "./types"
import type { ServiceFormValues } from "@/types/service"
import { supabase, mapDbService } from "@/lib/supabase"
import { logAudit } from "@/lib/audit"
import { PERM } from "@/lib/auth/permission-keys"

export const createServicesSlice: StateCreator<RivoState, [], [], ServicesSlice> = (set, get) => ({
  services: [],

  loadServices: async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) { console.error("loadServices:", error); return }
    set({ services: (data ?? []).map(mapDbService) })
  },

  addService: async (data: ServiceFormValues) => {
    if (!get().canDo(PERM.MANAGE_SERVICES))
      return { success: false, error: "غير مصرح" }

    const { data: inserted, error } = await supabase
      .from("services")
      .insert({
        name: data.name,
        category: data.category,
        price: data.price,
        duration: data.duration,
        is_active: data.status !== "archived",
        is_archived: data.status === "archived",
      })
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    set((s) => ({ services: [mapDbService(inserted), ...s.services] }))
    logAudit({
      actionType: "CREATE",
      entityType: "service",
      entityId: inserted.id,
      entityName: data.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { category: data.category, price: data.price, duration: data.duration },
    })
    return { success: true }
  },

  updateService: async (id, data: ServiceFormValues) => {
    if (!get().canDo(PERM.MANAGE_SERVICES))
      return { success: false, error: "غير مصرح" }

    const { error } = await supabase
      .from("services")
      .update({
        name: data.name,
        category: data.category,
        price: data.price,
        duration: data.duration,
        is_active: data.status !== "archived",
        is_archived: data.status === "archived",
      })
      .eq("id", id)
    if (error) return { success: false, error: error.message }
    set((s) => ({
      services: s.services.map((svc) => (svc.id === id ? { ...svc, ...data } : svc)),
    }))
    logAudit({
      actionType: "UPDATE",
      entityType: "service",
      entityId: id,
      entityName: data.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { category: data.category, price: data.price, status: data.status },
    })
    return { success: true }
  },

  toggleArchiveService: async (id) => {
    if (!get().canDo(PERM.MANAGE_SERVICES)) return

    const svc = get().services.find((s) => s.id === id)
    if (!svc) return
    const archiving = svc.status !== "archived"
    const { error } = await supabase
      .from("services")
      .update({ is_archived: archiving, is_active: !archiving })
      .eq("id", id)
    if (error) { console.error("toggleArchiveService:", error); return }
    set((s) => ({
      services: s.services.map((sv) =>
        sv.id === id ? { ...sv, status: archiving ? "archived" : "active" } : sv
      ),
    }))
    logAudit({
      actionType: "ARCHIVE",
      entityType: "service",
      entityId: id,
      entityName: svc.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { archived: archiving },
    })
  },

  deleteService: async (id) => {
    if (!get().canDo(PERM.MANAGE_SERVICES)) return

    const svc = get().services.find((s) => s.id === id)
    const { error } = await supabase.from("services").delete().eq("id", id)
    if (error) { console.error("deleteService:", error); return }
    set((s) => ({ services: s.services.filter((svc) => svc.id !== id) }))
    logAudit({
      actionType: "DELETE",
      entityType: "service",
      entityId: id,
      entityName: svc?.name ?? "",
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
    })
  },
})
