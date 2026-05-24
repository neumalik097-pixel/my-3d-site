import { z } from "zod"

export const CLIENT_TIERS = ["platinum", "gold", "silver", "new"] as const
export type ClientTier = (typeof CLIENT_TIERS)[number]

export const TIER_LABELS: Record<ClientTier, string> = {
  platinum: "بلاتيني",
  gold: "ذهبي",
  silver: "فضي",
  new: "جديد",
}

export const clientSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  tier: z.enum(["platinum", "gold", "silver", "new"]),
  notes: z.string().optional().or(z.literal("")),
})

export type ClientFormValues = z.infer<typeof clientSchema>

export interface Client extends ClientFormValues {
  id: string
  visitsCount: number
  totalSpent: number
  lastVisit?: string
  isActive: boolean
  createdAt: string
}
