import type { StateCreator } from "zustand"
import type { RivoState, ClientsSlice } from "./types"
import type { ClientFormValues } from "@/types/client"
import { supabase, mapDbCustomer } from "@/lib/supabase"
import { logAudit } from "@/lib/audit"
import { PERM } from "@/lib/auth/permission-keys"

export const createClientsSlice: StateCreator<RivoState, [], [], ClientsSlice> = (set, get) => ({
  clients: [],

  loadClients: async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
    if (error) { console.error("loadClients:", error); return }
    set({ clients: (data ?? []).map(mapDbCustomer) })
  },

  addClient: async (data: ClientFormValues) => {
    if (!get().canDo(PERM.MANAGE_CUSTOMERS))
      return { success: false, error: "غير مصرح" }

    const { data: row, error } = await supabase
      .from("customers")
      .insert({
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null,
        total_spent: 0,
        visits_count: 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) { console.error("addClient:", error); return { success: false, error: error.message } }

    set((s) => ({ clients: [mapDbCustomer(row), ...s.clients] }))
    logAudit({
      actionType: "CREATE",
      entityType: "customer",
      entityId: row.id,
      entityName: data.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { phone: data.phone || null, email: data.email || null },
    })
    return { success: true }
  },

  updateClient: async (id, data) => {
    if (!get().canDo(PERM.MANAGE_CUSTOMERS))
      return { success: false, error: "غير مصرح" }

    const { error } = await supabase
      .from("customers")
      .update({
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null,
      })
      .eq("id", id)

    if (error) { console.error("updateClient:", error); return { success: false, error: error.message } }

    set((s) => ({
      clients: s.clients.map((c) =>
        c.id === id
          ? { ...c, name: data.name, phone: data.phone ?? undefined, email: data.email ?? undefined, notes: data.notes ?? undefined }
          : c
      ),
    }))
    logAudit({
      actionType: "UPDATE",
      entityType: "customer",
      entityId: id,
      entityName: data.name,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
    })
    return { success: true }
  },

  deleteClient: async (id) => {
    if (!get().canDo(PERM.MANAGE_CUSTOMERS)) return

    const client = get().clients.find((c) => c.id === id)
    await supabase.from("customers").update({ is_active: false }).eq("id", id)
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }))
    logAudit({
      actionType: "ARCHIVE",
      entityType: "customer",
      entityId: id,
      entityName: client?.name ?? "",
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { soft_deleted: true },
    })
  },
})
