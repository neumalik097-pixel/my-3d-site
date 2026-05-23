import { z } from "zod"

export const SERVICE_CATEGORIES = ["الحلاقة", "اللحية", "العلاجات", "الباقات"] as const
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export const serviceSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  category: z.string().min(1, "الفئة مطلوبة"),
  price: z.coerce.number().min(0, "السعر يجب أن يكون موجباً"),
  duration: z.coerce.number().int().min(5, "المدة الدنيا ٥ دقائق"),
  popular: z.boolean().default(false),
  status: z.enum(["active", "archived"]),
})

export type ServiceFormValues = z.infer<typeof serviceSchema>

export interface Service extends ServiceFormValues {
  id: string
  createdAt: string
}

export const SERVICE_STATUS_LABELS = {
  active: "نشطة",
  archived: "مؤرشفة",
} as const
