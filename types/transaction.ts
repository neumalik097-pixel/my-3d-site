export interface TransactionItem {
  id: string
  type: "service" | "product" | "minibar"
  itemId: string
  name: string
  price: number
  buyPrice?: number  // cost price stored at sale time (products & minibar only)
  quantity: number
  subtotal: number
}

export type SaleType = "service" | "product" | "minibar" | "mixed"

export const SALE_TYPE_LABELS: Record<SaleType, string> = {
  service: "خدمة",
  product: "منتج",
  minibar: "ميني بار",
  mixed: "مختلط",
}

export type TransactionStatus = "completed" | "returned"

export interface Transaction {
  id: string
  items: TransactionItem[]
  saleType?: SaleType
  barberId: string | null
  barberName: string
  clientId?: string | null
  clientName: string
  subtotal: number
  discountType: "percentage" | "fixed"
  discountValue: number
  discountAmount: number
  taxEnabled: boolean
  taxRate: number
  taxAmount: number
  total: number
  paymentMethod: "cash" | "card"
  barberCommissionPct: number
  barberCommissionAmount: number
  createdBy?: string | null
  notes?: string
  createdAt: string
  // Return / refund audit fields — absent on legacy records (treated as "completed")
  status?: TransactionStatus
  returnedAt?: string
  returnedBy?: string | null
}
