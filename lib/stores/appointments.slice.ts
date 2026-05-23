import type { StateCreator } from "zustand"
import type { RivoState, AppointmentsSlice } from "./types"
import type { AppointmentFormValues } from "@/types/appointment"
import { supabase, mapDbAppointment } from "@/lib/supabase"
import { logAudit } from "@/lib/audit"
import { PERM } from "@/lib/auth/permission-keys"

export const createAppointmentsSlice: StateCreator<RivoState, [], [], AppointmentsSlice> = (set, get) => ({
  appointments: [],

  loadAppointments: async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
    if (error) return
    set({ appointments: (data ?? []).map(mapDbAppointment) })
  },

  addAppointment: async (data: AppointmentFormValues) => {
    if (!get().canDo(PERM.MANAGE_APPOINTMENTS))
      return { success: false, error: "غير مصرح" }

    const barberName = get().barbers.find((b) => b.id === data.barberId)?.name ?? null
    const serviceNames = data.serviceIds
      .map((id) => get().services.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(",")

    const { data: row, error } = await supabase
      .from("appointments")
      .insert({
        customer_name: data.clientName,
        barber_id: data.barberId || null,
        barber_name: barberName,
        service_id: data.serviceIds.join(","),
        service_name: serviceNames || null,
        appointment_date: data.date,
        appointment_time: data.time,
        status: data.status,
        notes: data.notes || null,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    set((s) => ({ appointments: [...s.appointments, mapDbAppointment(row)] }))

    get().addNotification({
      type: "appointment",
      title: "موعد جديد",
      message: `${data.clientName} — ${data.date} في ${data.time}`,
    })

    logAudit({
      actionType: "CREATE",
      entityType: "appointment",
      entityId: row.id,
      entityName: data.clientName,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { date: data.date, time: data.time, barberName: barberName ?? undefined, status: data.status },
    })

    return { success: true }
  },

  updateAppointment: async (id, data) => {
    if (!get().canDo(PERM.EDIT_APPOINTMENTS))
      return { success: false, error: "غير مصرح" }

    const barberName = get().barbers.find((b) => b.id === data.barberId)?.name ?? null
    const serviceNames = data.serviceIds
      .map((sid) => get().services.find((s) => s.id === sid)?.name)
      .filter(Boolean)
      .join(",")

    const { error } = await supabase
      .from("appointments")
      .update({
        customer_name: data.clientName,
        barber_id: data.barberId || null,
        barber_name: barberName,
        service_id: data.serviceIds.join(","),
        service_name: serviceNames || null,
        appointment_date: data.date,
        appointment_time: data.time,
        status: data.status,
        notes: data.notes || null,
      })
      .eq("id", id)

    if (error) return { success: false, error: error.message }

    set((s) => ({
      appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...data } : a)),
    }))

    logAudit({
      actionType: "UPDATE",
      entityType: "appointment",
      entityId: id,
      entityName: data.clientName,
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { date: data.date, time: data.time, status: data.status },
    })

    return { success: true }
  },

  updateAppointmentStatus: async (id, status) => {
    if (!get().canDo(PERM.EDIT_APPOINTMENTS)) return

    const appt = get().appointments.find((a) => a.id === id)
    await supabase.from("appointments").update({ status }).eq("id", id)
    set((s) => ({
      appointments: s.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
    }))
    logAudit({
      actionType: "UPDATE",
      entityType: "appointment",
      entityId: id,
      entityName: appt?.clientName ?? "",
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
      details: { status },
    })
  },

  deleteAppointment: async (id) => {
    if (!get().canDo(PERM.EDIT_APPOINTMENTS)) return

    const appt = get().appointments.find((a) => a.id === id)
    await supabase.from("appointments").delete().eq("id", id)
    set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }))
    logAudit({
      actionType: "DELETE",
      entityType: "appointment",
      entityId: id,
      entityName: appt?.clientName ?? "",
      performedBy: get().currentSession?.userId ?? null,
      performerName: get().currentSession?.name ?? null,
    })
  },
})
