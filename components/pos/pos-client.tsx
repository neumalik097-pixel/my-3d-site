"use client"

import { useState, useMemo, useCallback } from "react"
import {
  ShoppingCart, Plus, Minus, X, Search, CreditCard, Banknote,
  Receipt, Tag, Percent, CheckCircle2, User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBarbers, useServices, useProducts, useMinibar, useTransactions, useRivoStore } from "@/lib/store"
import type { CartItem } from "@/lib/store"
import { formatIQD } from "@/lib/currency"
import { toast } from "@/hooks/use-toast"
import type { Transaction, TransactionItem, SaleType } from "@/types/transaction"
import { cn } from "@/lib/utils"

// ─── Cart dispatch shim types (CartItem imported from store) ─────────────────

type CartAction =
  | { type: "ADD"; item: Omit<CartItem, "id" | "quantity"> }
  | { type: "REMOVE"; id: string }
  | { type: "SET_QTY"; id: string; qty: number }
  | { type: "CLEAR" }

function deriveSaleType(items: CartItem[]): SaleType {
  if (items.length === 0) return "service"
  const types = new Set(items.map((i) => i.type))
  if (types.size > 1) return "mixed"
  if (types.has("service")) return "service"
  if (types.has("product")) return "product"
  return "minibar"
}

// ─── Payment dialog ────────────────────────────────────────────────────────────

interface PaymentSummary {
  items: CartItem[]
  isGeneralSale: boolean
  barberName: string
  clientName: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  commissionAmount: number
  paymentMethod: "cash" | "card"
  invoiceId: string
}

function PaymentDialog({
  open, onOpenChange, summary, isProcessing, onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  summary: PaymentSummary
  isProcessing: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rivo-green" strokeWidth={2} />
            تأكيد الدفع — {summary.invoiceId}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="bg-black/[0.02] rounded-xl p-3 space-y-1.5 max-h-36 overflow-y-auto">
            {summary.items.map((item) => (
              <div key={item.id} className="flex justify-between text-[12px]">
                <span className="text-black/60">{item.name} × {item.quantity}</span>
                <span className="font-semibold text-black tabular-nums">{formatIQD(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between text-black/60">
              <span>المجموع الجزئي</span><span className="tabular-nums">{formatIQD(summary.subtotal)}</span>
            </div>
            {summary.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>الخصم</span><span className="tabular-nums">- {formatIQD(summary.discountAmount)}</span>
              </div>
            )}
            {summary.taxAmount > 0 && (
              <div className="flex justify-between text-black/60">
                <span>الضريبة (١٥٪)</span><span className="tabular-nums">{formatIQD(summary.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[15px] text-black border-t border-black/[0.06] pt-2 mt-1">
              <span>الإجمالي</span>
              <span className="tabular-nums text-rivo-green">{formatIQD(summary.total)}</span>
            </div>
          </div>
          <div className="bg-rivo-green/[0.06] rounded-xl p-3 space-y-1 text-[12px]">
            {summary.isGeneralSale ? (
              <div className="flex justify-between">
                <span className="text-black/50">نوع البيع</span>
                <span className="font-semibold text-black">مبيعة عامة</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-black/50">الحلاق</span>
                  <span className="font-semibold text-black">{summary.barberName}</span>
                </div>
                {summary.commissionAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-black/50">العمولة</span>
                    <span className="font-semibold text-rivo-green tabular-nums">{formatIQD(summary.commissionAmount)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <span className="text-black/50">طريقة الدفع</span>
              <span className="font-semibold text-black">{summary.paymentMethod === "cash" ? "نقداً" : "بطاقة"}</span>
            </div>
            {summary.clientName && summary.clientName !== "عميل عابر" && (
              <div className="flex justify-between">
                <span className="text-black/50">العميل</span>
                <span className="font-semibold text-black">{summary.clientName}</span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter dir="rtl" className="gap-2">
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2"
          >
            <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
            {isProcessing ? "جاري المعالجة..." : "تأكيد الدفع"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main POS ─────────────────────────────────────────────────────────────────

type CatalogTab = "services" | "products" | "minibar"

export function POSClient() {
  const { barbers } = useBarbers()
  const { services } = useServices()
  const { items: products } = useProducts()
  const { items: minibarItems } = useMinibar()
  const { nextInvoiceNum, commitTransaction } = useTransactions()

  // ── Persisted POS state (survives page navigation via Zustand) ───────────
  const cart = useRivoStore((s) => s.posCart)
  const barberId = useRivoStore((s) => s.posBarberId)
  const clientName = useRivoStore((s) => s.posClientName)
  const notes = useRivoStore((s) => s.posNotes)
  const discountType = useRivoStore((s) => s.posDiscountType)
  const discountValue = useRivoStore((s) => s.posDiscountValue)
  const taxEnabled = useRivoStore((s) => s.posTaxEnabled)
  const paymentMethod = useRivoStore((s) => s.posPaymentMethod)
  const setBarberId = useRivoStore((s) => s.posSetBarberId)
  const setClientName = useRivoStore((s) => s.posSetClientName)
  const setNotes = useRivoStore((s) => s.posSetNotes)
  const setDiscountType = useRivoStore((s) => s.posSetDiscountType)
  const setDiscountValue = useRivoStore((s) => s.posSetDiscountValue)
  const setTaxEnabled = useRivoStore((s) => s.posSetTaxEnabled)
  const setPaymentMethod = useRivoStore((s) => s.posSetPaymentMethod)
  const posReset = useRivoStore((s) => s.posReset)
  const posAddItem = useRivoStore((s) => s.posAddItem)
  const posRemoveItem = useRivoStore((s) => s.posRemoveItem)
  const posSetQty = useRivoStore((s) => s.posSetQty)
  const posClearCart = useRivoStore((s) => s.posClearCart)

  // ── Ephemeral UI state (not persisted) ────────────────────────────────────
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("services")
  const [search, setSearch] = useState("")
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // ── cartDispatch shim — keeps existing JSX unchanged ─────────────────────
  const cartDispatch = useCallback(
    (action: CartAction) => {
      if (action.type === "ADD") posAddItem(action.item)
      else if (action.type === "REMOVE") posRemoveItem(action.id)
      else if (action.type === "SET_QTY") posSetQty(action.id, action.qty)
      else if (action.type === "CLEAR") posClearCart()
    },
    [posAddItem, posRemoveItem, posSetQty, posClearCart]
  )

  const activeBarbers = useMemo(() => barbers.filter((b) => b.status !== "archived"), [barbers])
  const selectedBarber = useMemo(() => barbers.find((b) => b.id === barberId), [barbers, barberId])

  // ── Cart classification ───────────────────────────────────────────────────
  const cartHasServices = useMemo(() => cart.some((i) => i.type === "service"), [cart])
  const isBarberRequired = cartHasServices
  const isGeneralSale = cart.length > 0 && !isBarberRequired && !barberId

  const catalogItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (catalogTab === "services") {
      return services.filter((s) => s.status === "active" && (!q || s.name.toLowerCase().includes(q)))
    }
    if (catalogTab === "products") {
      return products.filter((p) => p.status === "active" && (!q || p.name.toLowerCase().includes(q)))
    }
    return minibarItems.filter((m) => m.status === "active" && (!q || m.name.toLowerCase().includes(q)))
  }, [catalogTab, search, services, products, minibarItems])

  const getCartQty = useCallback((type: CartItem["type"], itemId: string) =>
    cart.find((i) => i.type === type && i.itemId === itemId)?.quantity ?? 0, [cart])

  const getAvailableStock = useCallback((type: "product" | "minibar", itemId: string): number => {
    const inCart = getCartQty(type, itemId)
    const item = type === "product"
      ? products.find((p) => p.id === itemId)
      : minibarItems.find((m) => m.id === itemId)
    return (item?.stock ?? 0) - inCart
  }, [products, minibarItems, getCartQty])

  const handleAddItem = useCallback((type: CartItem["type"], itemId: string, name: string, price: number) => {
    if (type !== "service") {
      const available = getAvailableStock(type as "product" | "minibar", itemId)
      if (available <= 0) {
        toast({ title: "نفدت الكمية", description: `${name} غير متوفر في المخزون`, variant: "destructive" })
        return
      }
    }
    cartDispatch({ type: "ADD", item: { type, itemId, name, price } })
  }, [getAvailableStock])

  const handleIncreaseQty = useCallback((item: CartItem) => {
    if (item.type !== "service") {
      const available = getAvailableStock(item.type as "product" | "minibar", item.itemId)
      if (available <= 0) {
        toast({ title: "لا يمكن زيادة الكمية", description: "وصلت للحد الأقصى المتاح في المخزون", variant: "destructive" })
        return
      }
    }
    cartDispatch({ type: "SET_QTY", id: item.id, qty: item.quantity + 1 })
  }, [getAvailableStock])

  // ── Calculations ──────────────────────────────────────────────────────────
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart])
  const discountNum = parseFloat(discountValue) || 0
  const discountAmount = useMemo(() => {
    if (discountType === "percentage") return Math.round(subtotal * Math.min(discountNum, 100) / 100)
    return Math.min(discountNum, subtotal)
  }, [subtotal, discountType, discountNum])
  const afterDiscount = subtotal - discountAmount
  const taxAmount = taxEnabled ? Math.round(afterDiscount * 0.15) : 0
  const total = afterDiscount + taxAmount
  const effectiveCommissionPct = selectedBarber && !isGeneralSale ? selectedBarber.commissionPct : 0
  const commissionAmount = Math.round(total * effectiveCommissionPct / 100)
  const invoiceId = `INV-${String(nextInvoiceNum).padStart(4, "0")}`
  const saleType = useMemo(() => deriveSaleType(cart), [cart])

  // ── Open payment dialog ───────────────────────────────────────────────────
  const handleOpenPayment = useCallback(() => {
    if (cart.length === 0) {
      toast({ title: "السلة فارغة", description: "أضف عناصر من الكتالوج أولاً", variant: "destructive" })
      return
    }
    if (isBarberRequired && !barberId) {
      toast({ title: "يجب اختيار الحلاق", description: "الخدمات تتطلب تحديد حلاق للمتابعة", variant: "destructive" })
      return
    }
    setPaymentOpen(true)
  }, [cart.length, isBarberRequired, barberId])

  // ── Confirm payment ───────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (isProcessing) return
    setIsProcessing(true)

    const now = new Date().toISOString()
    const txItems: TransactionItem[] = cart.map((i) => {
      const buyPrice =
        i.type === "product"
          ? products.find((p) => p.id === i.itemId)?.buyPrice
          : i.type === "minibar"
          ? minibarItems.find((m) => m.id === i.itemId)?.buyPrice
          : undefined
      return {
        id: crypto.randomUUID(),
        type: i.type,
        itemId: i.itemId,
        name: i.name,
        price: i.price,
        buyPrice,
        quantity: i.quantity,
        subtotal: i.price * i.quantity,
      }
    })
    const transaction: Transaction = {
      id: invoiceId,
      items: txItems,
      saleType,
      barberId: barberId || null,
      barberName: selectedBarber?.name ?? (isGeneralSale ? "مبيعة عامة" : ""),
      clientName: clientName || "عميل عابر",
      subtotal,
      discountType,
      discountValue: discountNum,
      discountAmount,
      taxEnabled,
      taxRate: taxEnabled ? 0.15 : 0,
      taxAmount,
      total,
      paymentMethod,
      barberCommissionPct: effectiveCommissionPct,
      barberCommissionAmount: commissionAmount,
      notes: notes || undefined,
      createdAt: now,
    }
    const stockDeductions = cart
      .filter((i) => i.type === "product" || i.type === "minibar")
      .map((i) => ({ kind: i.type as "product" | "minibar", id: i.itemId, quantity: i.quantity }))

    const result = await commitTransaction(transaction, stockDeductions)
    if (!result.success) {
      toast({ title: "فشل حفظ المعاملة", description: result.error, variant: "destructive" })
      setIsProcessing(false)
      return
    }

    toast({ title: "تمت العملية بنجاح", description: `${invoiceId} — ${formatIQD(total)}`, variant: "success" })
    posReset()
    setPaymentOpen(false)
    setIsProcessing(false)
  }, [
    isProcessing, cart, clientName, notes, discountType, discountNum, discountAmount,
    taxEnabled, taxAmount, total, paymentMethod, invoiceId, selectedBarber, commissionAmount,
    commitTransaction, subtotal, barberId, saleType, isGeneralSale, effectiveCommissionPct,
    posReset,
  ])

  return (
    // No -m-6 here: fullHeight shell has no padding so there's nothing to cancel
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-rivo-cream flex-shrink-0">
        <div>
          <h1 className="text-[22px] font-bold text-black tracking-tight">نقطة البيع</h1>
          <p className="text-[13px] text-black/40 mt-0.5">{invoiceId} • {new Date().toLocaleDateString("ar-IQ")}</p>
        </div>
        {cart.length > 0 && (
          <div className="md:hidden text-left">
            <p className="text-[12px] font-bold text-black tabular-nums">{formatIQD(total)}</p>
            <p className="text-[11px] text-black/40">{cart.length} عنصر</p>
          </div>
        )}
      </div>

      {/* ── Main layout: stacked on mobile, side-by-side on md+ ─────────── */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

        {/* Catalog panel */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden border-b md:border-b-0 md:border-l border-black/[0.06]">
          {/* Catalog header */}
          <div className="px-4 pt-4 pb-3 space-y-3 border-b border-black/[0.06] flex-shrink-0">
            <Tabs value={catalogTab} onValueChange={(v) => { setCatalogTab(v as CatalogTab); setSearch("") }}>
              <TabsList className="w-full">
                <TabsTrigger value="services" className="flex-1">الخدمات</TabsTrigger>
                <TabsTrigger value="products" className="flex-1">المنتجات</TabsTrigger>
                <TabsTrigger value="minibar" className="flex-1">الميني بار</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 pointer-events-none" strokeWidth={1.8} />
              <Input
                dir="rtl"
                placeholder="بحث سريع..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-[13px] pr-9 bg-white"
              />
            </div>
          </div>

          {/* Item grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {catalogItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-black/30">
                <Search className="w-7 h-7 mb-2 opacity-40" strokeWidth={1.5} />
                <p className="text-[13px]">لا توجد نتائج</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {catalogItems.map((item) => {
                  const type: CartItem["type"] =
                    catalogTab === "services" ? "service" :
                    catalogTab === "products" ? "product" : "minibar"
                  const price = catalogTab === "services"
                    ? (item as { price: number }).price
                    : (item as { sellPrice: number }).sellPrice
                  const totalStock = catalogTab !== "services" ? (item as { stock: number }).stock : null
                  const availableStock = type !== "service"
                    ? getAvailableStock(type as "product" | "minibar", item.id)
                    : null
                  const inCart = getCartQty(type, item.id)
                  const genuinelyOutOfStock = totalStock !== null && totalStock === 0
                  const allInCart = availableStock !== null && availableStock <= 0 && inCart > 0
                  const cannotAdd = availableStock !== null && availableStock <= 0

                  return (
                    <button
                      key={item.id}
                      onClick={() => !cannotAdd && handleAddItem(type, item.id, item.name, price)}
                      disabled={cannotAdd}
                      className={cn(
                        "relative text-right p-3.5 rounded-xl border transition-all text-sm select-none",
                        cannotAdd
                          ? "bg-black/[0.03] border-black/[0.06] opacity-50 cursor-not-allowed"
                          : "bg-white border-black/[0.07] hover:border-rivo-green/40 hover:bg-rivo-green/[0.03] active:scale-[0.98]"
                      )}
                    >
                      {inCart > 0 && !cannotAdd && (
                        <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-rivo-green text-rivo-cream text-[10px] font-bold flex items-center justify-center">
                          {inCart}
                        </span>
                      )}
                      {genuinelyOutOfStock && (
                        <span className="absolute top-2 left-2 text-[9px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">
                          نفد
                        </span>
                      )}
                      {allInCart && (
                        <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-rivo-green/20 text-rivo-green text-[10px] font-bold flex items-center justify-center">
                          {inCart}
                        </span>
                      )}
                      <p className="text-[13px] font-semibold text-black leading-snug mb-1">{item.name}</p>
                      {availableStock !== null && (
                        <p className={cn("text-[10px] mb-1",
                          genuinelyOutOfStock ? "text-rose-400" :
                          allInCart ? "text-rivo-green/60" :
                          availableStock <= 5 ? "text-orange-500" :
                          "text-black/40"
                        )}>
                          {genuinelyOutOfStock ? "نفد المخزون" :
                           allInCart ? "كل المتاح في السلة" :
                           `متاح: ${availableStock}`}
                        </p>
                      )}
                      <p className="text-[14px] font-bold text-rivo-green tabular-nums">{formatIQD(price)}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart panel — fixed height on mobile, 360px wide on md+ */}
        <div className="h-[360px] md:h-auto md:w-[360px] flex-shrink-0 flex flex-col bg-white overflow-hidden">
          {/* Cart header */}
          <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-rivo-green" strokeWidth={2} />
              <span className="text-[14px] font-semibold text-black">السلة</span>
              {cart.length > 0 && (
                <span className="text-[11px] text-black/40">({cart.length})</span>
              )}
              {isGeneralSale && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">مبيعة عامة</Badge>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => cartDispatch({ type: "CLEAR" })}
                className="text-[11px] text-rose-500 hover:text-rose-600 font-medium transition-colors"
              >
                مسح الكل
              </button>
            )}
          </div>

          {/* Scrollable body: cart items + order info */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-black/25 px-4">
                <ShoppingCart className="w-7 h-7 mb-2 opacity-30" strokeWidth={1.5} />
                <p className="text-[12px] text-center">اختر عناصر من الكتالوج لإضافتها</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-black truncate">{item.name}</p>
                      <p className="text-[11px] text-black/45 tabular-nums">{formatIQD(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() =>
                          item.quantity === 1
                            ? cartDispatch({ type: "REMOVE", id: item.id })
                            : cartDispatch({ type: "SET_QTY", id: item.id, qty: item.quantity - 1 })
                        }
                        className="w-6 h-6 rounded-lg bg-black/[0.06] hover:bg-black/10 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3 text-black/60" strokeWidth={2.5} />
                      </button>
                      <span className="text-[13px] font-bold text-black tabular-nums w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleIncreaseQty(item)}
                        className="w-6 h-6 rounded-lg bg-black/[0.06] hover:bg-black/10 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3 h-3 text-black/60" strokeWidth={2.5} />
                      </button>
                    </div>
                    <p className="text-[12px] font-bold text-black tabular-nums w-[72px] text-left flex-shrink-0">
                      {formatIQD(item.price * item.quantity)}
                    </p>
                    <button
                      onClick={() => cartDispatch({ type: "REMOVE", id: item.id })}
                      className="text-black/25 hover:text-rose-500 transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Order info — only when cart has items */}
            {cart.length > 0 && (
              <div className="px-4 py-3 space-y-3 border-t border-black/[0.06]">
                {/* Barber */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-black/50 uppercase tracking-wide">
                    {isBarberRequired
                      ? <span>الحلاق <span className="text-rose-500">*</span></span>
                      : <span className="text-black/35">الحلاق (اختياري)</span>
                    }
                  </label>
                  <div className="flex gap-2 items-center">
                    <Select value={barberId} onValueChange={setBarberId}>
                      <SelectTrigger className={cn(
                        "h-9 text-[13px] flex-1",
                        isBarberRequired && !barberId && "border-rose-300 focus:ring-rose-200"
                      )}>
                        <SelectValue placeholder={isBarberRequired ? "اختر الحلاق..." : "بدون حلاق (مبيعة عامة)"} />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {activeBarbers.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} — {b.commissionPct}٪
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isBarberRequired && barberId && (
                      <button
                        type="button"
                        onClick={() => setBarberId("")}
                        className="flex-shrink-0 text-black/30 hover:text-rose-500 transition-colors"
                        title="إزالة الحلاق"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Client */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-black/50 uppercase tracking-wide">العميل</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 pointer-events-none" strokeWidth={1.8} />
                    <Input
                      dir="rtl"
                      placeholder="اسم العميل (اختياري)..."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="h-9 text-[13px] pr-9"
                    />
                  </div>
                </div>

                {/* Discount */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-black/50 uppercase tracking-wide flex items-center gap-1.5">
                    <Tag className="w-3 h-3" strokeWidth={2} />
                    الخصم
                  </label>
                  <div className="flex gap-2">
                    <div className="flex rounded-xl overflow-hidden border border-input flex-shrink-0">
                      <button
                        onClick={() => setDiscountType("percentage")}
                        className={cn(
                          "px-3 h-9 text-[12px] font-semibold transition-colors",
                          discountType === "percentage"
                            ? "bg-rivo-green text-rivo-cream"
                            : "bg-white text-black/50 hover:bg-black/[0.03]"
                        )}
                      >
                        <Percent className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => setDiscountType("fixed")}
                        className={cn(
                          "px-3 h-9 text-[12px] font-semibold transition-colors",
                          discountType === "fixed"
                            ? "bg-rivo-green text-rivo-cream"
                            : "bg-white text-black/50 hover:bg-black/[0.03]"
                        )}
                      >
                        IQD
                      </button>
                    </div>
                    <Input
                      dir="ltr"
                      type="number"
                      min={0}
                      placeholder={discountType === "percentage" ? "0%" : "0 د.ع"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="h-9 text-[13px] text-left flex-1"
                    />
                  </div>
                </div>

                {/* Tax toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => setTaxEnabled(!taxEnabled)}
                    className={cn(
                      "w-9 h-5 rounded-full transition-colors relative flex-shrink-0",
                      taxEnabled ? "bg-rivo-green" : "bg-black/10"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                      taxEnabled ? "right-0.5" : "left-0.5"
                    )} />
                  </div>
                  <span className="text-[12px] text-black/60 font-medium">إضافة ضريبة (١٥٪)</span>
                </label>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-black/50 uppercase tracking-wide">ملاحظات</label>
                  <textarea
                    dir="rtl"
                    placeholder="ملاحظات اختيارية..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-14 bg-white border border-input rounded-xl px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Totals + payment — sticky at bottom */}
          <div className="border-t border-black/[0.06] px-4 py-3 space-y-2.5 bg-white flex-shrink-0">
            <div className="space-y-1 text-[13px]">
              <div className="flex justify-between text-black/50">
                <span>المجموع الجزئي</span>
                <span className="tabular-nums font-medium">{formatIQD(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>الخصم</span>
                  <span className="tabular-nums font-semibold">- {formatIQD(discountAmount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-black/50">
                  <span>الضريبة (١٥٪)</span>
                  <span className="tabular-nums">{formatIQD(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[15px] text-black border-t border-black/[0.06] pt-1.5">
                <span>الإجمالي</span>
                <span className="tabular-nums text-rivo-green">{formatIQD(total)}</span>
              </div>
              {selectedBarber && !isGeneralSale && total > 0 && (
                <div className="flex justify-between text-[11px] text-black/40">
                  <span>عمولة {selectedBarber.name} ({selectedBarber.commissionPct}٪)</span>
                  <span className="tabular-nums">{formatIQD(commissionAmount)}</span>
                </div>
              )}
            </div>

            {/* Payment method */}
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={cn(
                  "flex-1 h-9 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors border",
                  paymentMethod === "cash"
                    ? "bg-rivo-green text-rivo-cream border-rivo-green"
                    : "bg-white text-black/60 border-black/[0.08] hover:bg-black/[0.02]"
                )}
              >
                <Banknote className="w-3.5 h-3.5" strokeWidth={1.8} />
                نقداً
              </button>
              <button
                onClick={() => setPaymentMethod("card")}
                className={cn(
                  "flex-1 h-9 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors border",
                  paymentMethod === "card"
                    ? "bg-rivo-green text-rivo-cream border-rivo-green"
                    : "bg-white text-black/60 border-black/[0.08] hover:bg-black/[0.02]"
                )}
              >
                <CreditCard className="w-3.5 h-3.5" strokeWidth={1.8} />
                بطاقة
              </button>
            </div>

            <Button
              onClick={handleOpenPayment}
              disabled={cart.length === 0 || isProcessing}
              className={cn(
                "w-full h-10 text-[13px] font-bold gap-2 transition-all",
                cart.length === 0
                  ? "bg-black/[0.06] text-black/30 cursor-not-allowed hover:bg-black/[0.06]"
                  : "bg-rivo-green text-rivo-cream hover:bg-rivo-green/90"
              )}
            >
              <Receipt className="w-4 h-4" strokeWidth={2} />
              {cart.length === 0 ? "أضف عناصر للمتابعة" : `إتمام الدفع — ${formatIQD(total)}`}
            </Button>
          </div>
        </div>
      </div>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        isProcessing={isProcessing}
        onConfirm={handleConfirm}
        summary={{
          items: cart,
          isGeneralSale,
          barberName: selectedBarber?.name ?? "",
          clientName: clientName || "عميل عابر",
          subtotal, discountAmount, taxAmount, total, commissionAmount,
          paymentMethod, invoiceId,
        }}
      />
    </div>
  )
}
