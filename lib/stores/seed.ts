import type { Barber } from "@/types/barber"
import type { Service } from "@/types/service"
import type { InventoryItem } from "@/types/inventory"
import type { Client } from "@/types/client"
import type { Appointment } from "@/types/appointment"

export const SEED_BARBERS: Barber[] = [
  { id: "b1", name: "أحمد خالد", phone: "0501234567", commissionPct: 25, status: "active", createdAt: "2025-01-10T00:00:00.000Z" },
  { id: "b2", name: "محمد علي", phone: "0551234567", commissionPct: 20, status: "active", createdAt: "2025-02-15T00:00:00.000Z" },
  { id: "b3", name: "عمر حسن", phone: "0561234567", commissionPct: 22, status: "on_break", createdAt: "2025-03-01T00:00:00.000Z" },
  { id: "b4", name: "سامي الرشيد", phone: "", commissionPct: 15, status: "archived", createdAt: "2025-04-20T00:00:00.000Z" },
]

export const SEED_SERVICES: Service[] = [
  { id: "s1", name: "حلاقة كاملة", category: "الحلاقة", price: 12000, duration: 30, popular: true, status: "active", createdAt: "2025-01-01T00:00:00.000Z" },
  { id: "s2", name: "حلاقة الأطفال (أقل من ١٢)", category: "الحلاقة", price: 8000, duration: 20, popular: false, status: "active", createdAt: "2025-01-01T00:00:00.000Z" },
  { id: "s3", name: "حلاقة كلاسيكية بالموس", category: "الحلاقة", price: 15000, duration: 45, popular: false, status: "active", createdAt: "2025-01-01T00:00:00.000Z" },
  { id: "s4", name: "تشكيل اللحية", category: "اللحية", price: 8000, duration: 20, popular: true, status: "active", createdAt: "2025-01-01T00:00:00.000Z" },
  { id: "s5", name: "حلاقة اللحية بالموس", category: "اللحية", price: 10000, duration: 30, popular: false, status: "active", createdAt: "2025-01-01T00:00:00.000Z" },
  { id: "s6", name: "صبغ اللحية", category: "اللحية", price: 14000, duration: 40, popular: false, status: "active", createdAt: "2025-01-01T00:00:00.000Z" },
  { id: "s7", name: "علاج فروة الرأس", category: "العلاجات", price: 22000, duration: 60, popular: true, status: "active", createdAt: "2025-01-01T00:00:00.000Z" },
  { id: "s8", name: "ترطيب الشعر", category: "العلاجات", price: 14000, duration: 30, popular: false, status: "active", createdAt: "2025-01-01T00:00:00.000Z" },
  { id: "s9", name: "باقة النخبة (حلاقة + لحية + علاج)", category: "الباقات", price: 35000, duration: 90, popular: true, status: "active", createdAt: "2025-01-01T00:00:00.000Z" },
  { id: "s10", name: "باقة الحلاقة + اللحية", category: "الباقات", price: 18000, duration: 50, popular: true, status: "active", createdAt: "2025-01-01T00:00:00.000Z" },
]

export const SEED_PRODUCTS: InventoryItem[] = [
  { id: "p1", name: "شامبو أمريكان كرو", buyPrice: 18000, sellPrice: 27000, stock: 24, lowStockThreshold: 5, status: "active", createdAt: "2025-01-10T00:00:00.000Z" },
  { id: "p2", name: "بومادة فيشر", buyPrice: 22000, sellPrice: 38000, stock: 3, lowStockThreshold: 5, status: "active", createdAt: "2025-02-01T00:00:00.000Z" },
  { id: "p3", name: "زيت اللحية", buyPrice: 12000, sellPrice: 22000, stock: 18, lowStockThreshold: 4, status: "active", createdAt: "2025-02-15T00:00:00.000Z" },
  { id: "p4", name: "كريم الحلاقة", buyPrice: 8000, sellPrice: 15000, stock: 0, lowStockThreshold: 3, status: "archived", createdAt: "2025-03-01T00:00:00.000Z" },
]

export const SEED_MINIBAR_ITEMS: InventoryItem[] = [
  { id: "m1", name: "ماء معدني", buyPrice: 500, sellPrice: 1000, stock: 48, status: "active", createdAt: "2025-01-15T00:00:00.000Z" },
  { id: "m2", name: "عصير برتقال", buyPrice: 1000, sellPrice: 2500, stock: 12, status: "active", createdAt: "2025-01-20T00:00:00.000Z" },
  { id: "m3", name: "قهوة عربية", buyPrice: 750, sellPrice: 2000, stock: 30, status: "active", createdAt: "2025-02-05T00:00:00.000Z" },
  { id: "m4", name: "كرواسون", buyPrice: 1500, sellPrice: 3500, stock: 0, status: "archived", createdAt: "2025-03-10T00:00:00.000Z" },
]

export const SEED_CLIENTS: Client[] = [
  { id: "c1", name: "عبدالله المطيري", phone: "0500123456", email: "", tier: "platinum", visits: 12, totalSpent: 432000, lastVisit: "2026-05-19T00:00:00.000Z", notes: "", createdAt: "2025-01-05T00:00:00.000Z" },
  { id: "c2", name: "فيصل الدوسري", phone: "0550987654", email: "", tier: "gold", visits: 8, totalSpent: 192000, lastVisit: "2026-05-17T00:00:00.000Z", notes: "", createdAt: "2025-02-10T00:00:00.000Z" },
  { id: "c3", name: "سلطان العتيبي", phone: "0560345678", email: "", tier: "silver", visits: 5, totalSpent: 96000, lastVisit: "2026-05-14T00:00:00.000Z", notes: "", createdAt: "2025-03-15T00:00:00.000Z" },
  { id: "c4", name: "راشد الشمري", phone: "0540678901", email: "", tier: "platinum", visits: 18, totalSpent: 720000, lastVisit: "2026-05-18T00:00:00.000Z", notes: "", createdAt: "2025-01-20T00:00:00.000Z" },
  { id: "c5", name: "خالد الحربي", phone: "0530234567", email: "", tier: "silver", visits: 3, totalSpent: 54000, lastVisit: "2026-05-10T00:00:00.000Z", notes: "", createdAt: "2025-04-01T00:00:00.000Z" },
  { id: "c6", name: "نايف العمري", phone: "0520890123", email: "", tier: "gold", visits: 7, totalSpent: 224000, lastVisit: "2026-05-12T00:00:00.000Z", notes: "", createdAt: "2025-02-25T00:00:00.000Z" },
  { id: "c7", name: "بدر القحطاني", phone: "0590456789", email: "", tier: "platinum", visits: 21, totalSpent: 960000, lastVisit: "2026-05-19T00:00:00.000Z", notes: "", createdAt: "2024-12-01T00:00:00.000Z" },
  { id: "c8", name: "تركي الغامدي", phone: "0561234567", email: "", tier: "new", visits: 1, totalSpent: 12000, lastVisit: "2026-05-19T00:00:00.000Z", notes: "", createdAt: "2026-05-19T00:00:00.000Z" },
]

export const SEED_APPOINTMENTS: Appointment[] = [
  { id: "a1", clientName: "عبدالله المطيري", clientId: "c1", barberId: "b1", serviceIds: ["s1", "s4"], date: "2026-05-19", time: "10:00", status: "confirmed", notes: "", createdAt: "2026-05-15T00:00:00.000Z" },
  { id: "a2", clientName: "فيصل الدوسري", clientId: "c2", barberId: "b2", serviceIds: ["s1"], date: "2026-05-19", time: "11:30", status: "completed", notes: "", createdAt: "2026-05-15T00:00:00.000Z" },
  { id: "a3", clientName: "سلطان العتيبي", clientId: "c3", barberId: "b1", serviceIds: ["s4"], date: "2026-05-19", time: "12:00", status: "confirmed", notes: "", createdAt: "2026-05-16T00:00:00.000Z" },
  { id: "a4", clientName: "راشد الشمري", clientId: "c4", barberId: "b3", serviceIds: ["s1", "s7"], date: "2026-05-19", time: "13:15", status: "confirmed", notes: "", createdAt: "2026-05-16T00:00:00.000Z" },
  { id: "a5", clientName: "خالد الحربي", clientId: "c5", barberId: "b2", serviceIds: ["s1"], date: "2026-05-19", time: "14:00", status: "cancelled", notes: "ألغى بسبب ظروف طارئة", createdAt: "2026-05-17T00:00:00.000Z" },
  { id: "a6", clientName: "نايف العمري", clientId: "c6", barberId: "b3", serviceIds: ["s4", "s8"], date: "2026-05-20", time: "09:30", status: "pending", notes: "", createdAt: "2026-05-18T00:00:00.000Z" },
  { id: "a7", clientName: "بدر القحطاني", clientId: "c7", barberId: "b1", serviceIds: ["s1"], date: "2026-05-20", time: "10:45", status: "confirmed", notes: "", createdAt: "2026-05-18T00:00:00.000Z" },
]
