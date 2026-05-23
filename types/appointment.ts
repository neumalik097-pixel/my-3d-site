import { z } from "zod"

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "معلق",
  confirmed: "مؤكد",
  completed: "مكتمل",
  cancelled: "ملغي",
  no_show: "غياب",
}

export const appointmentSchema = z.object({
  clientName: z.string().min(1, "اسم العميل مطلوب"),
  clientId: z.string().optional().or(z.literal("")),
  barberId: z.string().min(1, "يجب اختيار الحلاق"),
  serviceIds: z.array(z.string()).min(1, "يجب اختيار خدمة واحدة على الأقل"),
  date: z.string().min(1, "يجب تحديد التاريخ"),
  time: z.string().min(1, "يجب تحديد الوقت"),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
  notes: z.string().optional().or(z.literal("")),
})

export type AppointmentFormValues = z.infer<typeof appointmentSchema>

export interface Appointment extends AppointmentFormValues {
  id: string
  createdAt: string
}
