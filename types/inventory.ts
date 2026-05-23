import { z } from "zod"

export const INVENTORY_STATUSES = ["active", "archived"] as const
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number]

export const inventorySchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  buyPrice: z.coerce.number().min(0, "لا يمكن أن يكون سالباً"),
  sellPrice: z.coerce.number().min(0, "لا يمكن أن يكون سالباً"),
  stock: z.coerce
    .number()
    .int("يجب أن يكون عدداً صحيحاً")
    .min(0, "لا يمكن أن يكون سالباً"),
  lowStockThreshold: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  status: z.enum(["active", "archived"]),
  imageUrl: z.string().optional(),
})

export type InventoryFormValues = z.infer<typeof inventorySchema>

export interface InventoryItem extends Omit<InventoryFormValues, "lowStockThreshold"> {
  id: string
  lowStockThreshold?: number
  createdAt: string
}

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  active: "نشط",
  archived: "مؤرشف",
}
