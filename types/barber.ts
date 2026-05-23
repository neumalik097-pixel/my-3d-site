import { z } from "zod"

export const BARBER_STATUSES = ["active", "on_break", "archived"] as const
export type BarberStatus = (typeof BARBER_STATUSES)[number]

export const barberSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  phone: z.string().optional().or(z.literal("")),
  commissionPct: z.coerce
    .number()
    .min(0, "لا يمكن أن يكون سالباً")
    .max(100, "لا يتجاوز 100"),
  status: z.enum(["active", "on_break", "archived"]),
})

export type BarberFormValues = z.infer<typeof barberSchema>

export interface Barber extends BarberFormValues {
  id: string
  createdAt: string
}

export const STATUS_LABELS: Record<BarberStatus, string> = {
  active: "نشط",
  on_break: "في استراحة",
  archived: "مؤرشف",
}
