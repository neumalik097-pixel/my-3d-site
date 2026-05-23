import { createClient } from "@supabase/supabase-js"
import type { User } from "@/lib/auth/types"
import type { Barber } from "@/types/barber"
import type { Service } from "@/types/service"
import type { InventoryItem } from "@/types/inventory"
import type { Transaction, TransactionItem, SaleType, TransactionStatus } from "@/types/transaction"
import type { Appointment, AppointmentStatus } from "@/types/appointment"
import type { Client, ClientTier } from "@/types/client"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── DB row shapes ────────────────────────────────────────────────────────────

export interface DbUser {
  id: string
  name: string
  username: string
  password: string
  role: "super_admin" | "admin" | "staff"
  barber_id: string | null
  is_archived: boolean
  created_at: string
  updated_at?: string
}

export interface DbBarber {
  id: string
  name: string
  phone: string | null
  commission_percentage: number
  role: string
  is_active: boolean
  created_at: string
}

export interface DbService {
  id: string
  name: string
  price: number
  duration: number
  category: string
  description: string | null
  is_active: boolean
  is_archived: boolean
  created_at: string
}

// DB columns category/description exist but are not in the frontend type — ignored.
// No image_url column — imageUrl stays undefined on load, not sent on write.
export interface DbMinibarItem {
  id: string
  name: string
  category: string | null
  cost_price: number
  sale_price: number
  quantity: number
  minimum_stock: number | null
  description: string | null
  is_active: boolean
  is_archived: boolean
  created_at: string
}

// DB columns barcode/category/brand/description exist but are not in the frontend type — ignored.
export interface DbProduct {
  id: string
  name: string
  barcode: string | null
  category: string | null
  brand: string | null
  cost_price: number
  sale_price: number
  quantity: number
  minimum_stock: number | null
  description: string | null
  image_url: string | null
  is_active: boolean
  is_archived: boolean
  created_at: string
}

// ─── DB → Frontend mappings ───────────────────────────────────────────────────

export function mapDbUser(row: DbUser): User {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    password: row.password,
    role: row.role,
    status: row.is_archived ? "archived" : "active",
    barberId: row.barber_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  }
}

// is_archived=false → "active", is_archived=true → "archived"
// popular has no DB column — always defaults to false on load.
export function mapDbService(row: DbService): Service {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    duration: row.duration,
    category: row.category,
    popular: false,
    status: row.is_archived ? "archived" : "active",
    createdAt: row.created_at,
  }
}

// Same field mapping as products. No image_url in minibar table → imageUrl stays undefined.
export function mapDbMinibarItem(row: DbMinibarItem): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    buyPrice: row.cost_price,
    sellPrice: row.sale_price,
    stock: row.quantity,
    lowStockThreshold: row.minimum_stock ?? undefined,
    imageUrl: undefined,
    status: row.is_archived ? "archived" : "active",
    createdAt: row.created_at,
  }
}

// cost_price→buyPrice, sale_price→sellPrice, quantity→stock, minimum_stock→lowStockThreshold
export function mapDbProduct(row: DbProduct): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    buyPrice: row.cost_price,
    sellPrice: row.sale_price,
    stock: row.quantity,
    lowStockThreshold: row.minimum_stock ?? undefined,
    imageUrl: row.image_url ?? undefined,
    status: row.is_archived ? "archived" : "active",
    createdAt: row.created_at,
  }
}

export interface DbCustomer {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  total_spent: number
  visits_count: number
  last_visit: string | null
  is_active: boolean
  created_at: string
}

function deriveClientTier(totalSpent: number): ClientTier {
  if (totalSpent >= 500000) return "platinum"
  if (totalSpent >= 150000) return "gold"
  if (totalSpent >= 50000) return "silver"
  return "new"
}

export function mapDbCustomer(row: DbCustomer): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    tier: deriveClientTier(row.total_spent),
    visitsCount: row.visits_count,
    totalSpent: row.total_spent,
    lastVisit: row.last_visit ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

export interface DbAppointment {
  id: string
  customer_name: string
  customer_phone: string | null
  barber_id: string | null
  barber_name: string | null
  service_id: string | null
  service_name: string | null
  appointment_date: string
  appointment_time: string
  status: string
  notes: string | null
  created_at: string
}

export function mapDbAppointment(row: DbAppointment): Appointment {
  return {
    id: row.id,
    clientName: row.customer_name,
    clientId: "",
    barberId: row.barber_id ?? "",
    serviceIds: row.service_id ? row.service_id.split(",").filter(Boolean) : [],
    date: row.appointment_date,
    time: row.appointment_time.slice(0, 5),
    status: row.status as AppointmentStatus,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

// is_active=true → "active", is_active=false → "archived"
// Note: "on_break" is a client-side state only; DB stores it as is_active=true.
export function mapDbBarber(row: DbBarber): Barber {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    commissionPct: row.commission_percentage,
    status: row.is_active ? "active" : "archived",
    createdAt: row.created_at,
  }
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface DbInvoice {
  id: string
  invoice_number: string
  barber_id: string | null
  barber_name: string | null
  client_name: string
  subtotal: number
  discount_type: string
  discount_value: number
  discount_amount: number
  tax_enabled: boolean
  tax_rate: number
  tax_amount: number
  total: number
  payment_method: string
  barber_commission_pct: number
  barber_commission_amount: number
  sale_type: string | null
  notes: string | null
  status: string
  returned_at: string | null
  returned_by: string | null
  created_by: string | null
  created_at: string
}

export interface DbInvoiceItem {
  id: string
  invoice_id: string
  item_type: string
  item_id: string
  name: string
  price: number
  buy_price: number | null
  quantity: number
  subtotal: number
}

export function mapDbInvoiceItem(row: DbInvoiceItem): TransactionItem {
  return {
    id: row.id,
    type: row.item_type as "service" | "product" | "minibar",
    itemId: row.item_id,
    name: row.name,
    price: row.price,
    buyPrice: row.buy_price ?? undefined,
    quantity: row.quantity,
    subtotal: row.subtotal,
  }
}

export function mapDbInvoice(row: DbInvoice, items: DbInvoiceItem[]): Transaction {
  return {
    id: row.invoice_number,
    items: items.map(mapDbInvoiceItem),
    saleType: (row.sale_type as SaleType) ?? undefined,
    barberId: row.barber_id ?? null,
    barberName: row.barber_name ?? "",
    clientName: row.client_name,
    subtotal: row.subtotal,
    discountType: row.discount_type as "percentage" | "fixed",
    discountValue: row.discount_value,
    discountAmount: row.discount_amount,
    taxEnabled: row.tax_enabled,
    taxRate: row.tax_rate,
    taxAmount: row.tax_amount,
    total: row.total,
    paymentMethod: row.payment_method as "cash" | "card",
    barberCommissionPct: row.barber_commission_pct,
    barberCommissionAmount: row.barber_commission_amount,
    createdBy: row.created_by ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    status: (row.status as TransactionStatus) ?? "completed",
    returnedAt: row.returned_at ?? undefined,
    returnedBy: row.returned_by ?? undefined,
  }
}
