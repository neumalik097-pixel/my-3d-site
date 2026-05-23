"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import {
  TrendingUp, Receipt, Users, BarChart3,
  ChevronLeft, ChevronRight, Search, X, Package, Coffee, Trash2, RotateCcw,
  Scissors,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useTransactions, useBarbers, useProducts, useMinibar, useRivoStore } from "@/lib/store"
import { can } from "@/lib/auth/permissions"
import { supabase } from "@/lib/supabase"
import { formatIQD } from "@/lib/currency"
import { toast } from "@/hooks/use-toast"
import type { Transaction, SaleType } from "@/types/transaction"
import { SALE_TYPE_LABELS } from "@/types/transaction"
import type { InventoryItem } from "@/types/inventory"
import { cn } from "@/lib/utils"

// ─── RPC response types ───────────────────────────────────────────────────────

interface DashboardAnalytics {
  total_revenue: number
  minibar_revenue: number
  services_revenue: number
  total_commissions: number
  invoice_count: number
}

interface BarberPerformance {
  barber_name: string
  total_revenue: number
  commission: number
  services_count: number
}

type AnalyticsRange = "day" | "week" | "month" | "custom"

// ─── Analytics date helpers ───────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getAnalyticsDates(
  range: AnalyticsRange,
  customStart: string,
  customEnd: string,
): { start: string; end: string } | null {
  const now = new Date()
  const today = toLocalDateStr(now)
  if (range === "day") return { start: today, end: today }
  if (range === "week") {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    return { start: toLocalDateStr(d), end: today }
  }
  if (range === "month") {
    return { start: toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), end: today }
  }
  if (range === "custom" && customStart && customEnd && customStart <= customEnd) {
    return { start: customStart, end: customEnd }
  }
  return null
}

// ─── Period helpers ───────────────────────────────────────────────────────────

type PeriodTab = "today" | "week" | "month" | "all"
type StatusFilter = "all" | "completed" | "returned"
const PAGE_SIZE = 15

function getStart(period: PeriodTab): Date | null {
  const now = new Date()
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return d }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1)
  return null
}

// ─── Sale type helpers ────────────────────────────────────────────────────────

function getTxSaleType(tx: Transaction): SaleType {
  if (tx.saleType) return tx.saleType
  const types = new Set(tx.items.map((i) => i.type))
  if (types.size > 1) return "mixed"
  const [first] = types
  return (first as SaleType) ?? "service"
}

function SaleTypePill({ type }: { type: SaleType }) {
  const styles: Record<SaleType, string> = {
    service: "bg-rivo-green/10 text-rivo-green",
    product: "bg-blue-50 text-blue-600",
    minibar: "bg-amber-50 text-amber-600",
    mixed: "bg-slate-100 text-slate-500",
  }
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none",
      styles[type]
    )}>
      {SALE_TYPE_LABELS[type]}
    </span>
  )
}

const ITEM_DOT: Record<"service" | "product" | "minibar", string> = {
  service: "bg-rivo-green/60",
  product: "bg-blue-400/70",
  minibar: "bg-amber-400/70",
}

// ─── Profit engine ────────────────────────────────────────────────────────────

function calcTxProfit(
  tx: Transaction,
  products: InventoryItem[],
  minibarItems: InventoryItem[]
): number {
  const cogs = tx.items
    .filter((i) => i.type !== "service")
    .reduce((s, i) => {
      const buyPrice =
        i.buyPrice ??
        (i.type === "product"
          ? products.find((p) => p.id === i.itemId)?.buyPrice
          : minibarItems.find((m) => m.id === i.itemId)?.buyPrice) ??
        0
      return s + buyPrice * i.quantity
    }, 0)
  return Math.round(tx.total - cogs - tx.barberCommissionAmount)
}

// ─── Top items list ────────────────────────────────────────────────────────────

function TopItemsList({
  items,
  emptyLabel,
}: {
  items: { name: string; count: number; revenue: number }[]
  emptyLabel: string
}) {
  if (items.length === 0) {
    return <p className="text-[12px] text-black/30 text-center py-5">{emptyLabel}</p>
  }
  return (
    <div className="space-y-2.5">
      {items.map((s, i) => (
        <div key={s.name} className="flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-md bg-rivo-green/[0.08] flex items-center justify-center text-[10px] font-bold text-rivo-green flex-shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-black/70 truncate">{s.name}</p>
            <p className="text-[10px] text-black/35">{s.count} وحدة</p>
          </div>
          <p className="text-[12px] font-bold text-black tabular-nums flex-shrink-0">
            {formatIQD(s.revenue)}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReportsClient() {
  // ── RPC analytics state ─────────────────────────────────────────────────────
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("month")
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date()
    return toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
  })
  const [customEnd, setCustomEnd] = useState<string>(() => toLocalDateStr(new Date()))
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [barberPerf, setBarberPerf] = useState<BarberPerformance[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  useEffect(() => {
    const dates = getAnalyticsDates(analyticsRange, customStart, customEnd)
    if (!dates) return

    let cancelled = false
    setAnalyticsLoading(true)
    setAnalyticsError(null)

    Promise.all([
      supabase.rpc("get_dashboard_analytics", { start_date: dates.start, end_date: dates.end }),
      supabase.rpc("get_barbers_performance", { start_date: dates.start, end_date: dates.end }),
    ]).then(([analyticsRes, barberRes]) => {
      if (cancelled) return
      if (analyticsRes.error) {
        setAnalyticsError(analyticsRes.error.message)
        setAnalytics(null)
      } else {
        setAnalytics(analyticsRes.data as DashboardAnalytics)
      }
      if (!barberRes.error) {
        setBarberPerf((barberRes.data as BarberPerformance[]) ?? [])
      }
      setAnalyticsLoading(false)
    })

    return () => { cancelled = true }
  }, [analyticsRange, customStart, customEnd])

  // ── Existing state ──────────────────────────────────────────────────────────
  const { transactions, returnTransaction, deleteTransaction } = useTransactions()
  const { barbers } = useBarbers()
  const { items: products } = useProducts()
  const currentSession = useRivoStore((s) => s.currentSession)
  const canDelete = can(currentSession?.role, "transaction:delete")
  const canReturn = can(currentSession?.role, "transaction:return")
  const { items: minibarItems } = useMinibar()

  const [period, setPeriod]             = useState<PeriodTab>("month")
  const [search, setSearch]             = useState("")
  const [barberFilter, setBarberFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("all")
  const [minibarFilter, setMinibarFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [page, setPage]                 = useState(1)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingReturnId, setPendingReturnId] = useState<string | null>(null)

  const handleDelete = useCallback(async () => {
    if (!pendingDeleteId) return
    await deleteTransaction(pendingDeleteId)
    toast({ title: "تم حذف الفاتورة نهائياً", variant: "success" })
    setPendingDeleteId(null)
  }, [pendingDeleteId, deleteTransaction])

  const handleReturn = useCallback(async () => {
    if (!pendingReturnId) return
    const result = await returnTransaction(pendingReturnId)
    if (result.success) {
      toast({
        title: "تم إرجاع الفاتورة بنجاح",
        description: "تم استعادة المخزون وتحديث حالة الفاتورة",
        variant: "success",
      })
    } else {
      toast({
        title: result.error === "تم إرجاع هذه الفاتورة مسبقاً"
          ? "لا يمكن تكرار الإرجاع"
          : "فشل تنفيذ الإرجاع",
        description: result.error,
        variant: "destructive",
      })
    }
    setPendingReturnId(null)
  }, [pendingReturnId, returnTransaction])

  // Unique item names from all stored transactions (for filter dropdowns)
  const allProductNames = useMemo(() => {
    const names = new Set<string>()
    for (const tx of transactions) {
      for (const item of tx.items) {
        if (item.type === "product") names.add(item.name)
      }
    }
    return Array.from(names).sort()
  }, [transactions])

  const allMinibarNames = useMemo(() => {
    const names = new Set<string>()
    for (const tx of transactions) {
      for (const item of tx.items) {
        if (item.type === "minibar") names.add(item.name)
      }
    }
    return Array.from(names).sort()
  }, [transactions])

  // ── Filtered transactions (period + search + barber + payment + product/minibar)
  const filteredTx = useMemo(() => {
    const start = getStart(period)
    const q = search.trim().toLowerCase()
    return transactions
      .filter((tx) => {
        const matchPeriod = !start || new Date(tx.createdAt) >= start
        const matchSearch =
          !q ||
          tx.id.toLowerCase().includes(q) ||
          tx.clientName.toLowerCase().includes(q) ||
          (tx.barberName || "").toLowerCase().includes(q) ||
          tx.items.some((i) => i.name.toLowerCase().includes(q))
        const matchBarber = barberFilter === "all" || tx.barberId === barberFilter
        const matchPayment = paymentFilter === "all" || tx.paymentMethod === paymentFilter
        const matchProduct =
          productFilter === "all" ||
          tx.items.some((i) => i.type === "product" && i.name === productFilter)
        const matchMinibar =
          minibarFilter === "all" ||
          tx.items.some((i) => i.type === "minibar" && i.name === minibarFilter)
        return matchPeriod && matchSearch && matchBarber && matchPayment && matchProduct && matchMinibar
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [transactions, period, search, barberFilter, paymentFilter, productFilter, minibarFilter])

  // Active (non-returned) transactions — used for all financial analytics
  const activeTx = useMemo(
    () => filteredTx.filter((tx) => (tx.status ?? "completed") !== "returned"),
    [filteredTx]
  )

  // Display transactions (applies status filter for history table)
  const displayTx = useMemo(() => {
    if (statusFilter === "all") return filteredTx
    if (statusFilter === "returned") return filteredTx.filter((tx) => tx.status === "returned")
    return filteredTx.filter((tx) => (tx.status ?? "completed") === "completed")
  }, [filteredTx, statusFilter])

  // Precompute profit for each active transaction
  const txProfitMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of activeTx) {
      map.set(tx.id, calcTxProfit(tx, products, minibarItems))
    }
    return map
  }, [activeTx, products, minibarItems])

  // Returned count within current period (for info display)
  const returnedCount = useMemo(
    () => filteredTx.filter((tx) => tx.status === "returned").length,
    [filteredTx]
  )

  // ── KPIs (active transactions only — returned invoices excluded) ──────────
  const kpis = useMemo(() => {
    const revenue    = activeTx.reduce((s, tx) => s + tx.total, 0)
    const count      = activeTx.length
    const commission = activeTx.reduce((s, tx) => s + tx.barberCommissionAmount, 0)
    const totalProfit = activeTx.reduce((s, tx) => s + (txProfitMap.get(tx.id) ?? 0), 0)
    return { revenue, count, commission, totalProfit }
  }, [activeTx, txProfitMap])

  // ── Barber stats (active transactions only) ───────────────────────────────
  const barberStats = useMemo(() => {
    const map = new Map<string, {
      name: string; revenue: number; commission: number; count: number; profit: number
    }>()
    for (const tx of activeTx) {
      if (!tx.barberId) continue
      const txProfit = txProfitMap.get(tx.id) ?? 0
      const existing = map.get(tx.barberId)
      if (existing) {
        existing.revenue    += tx.total
        existing.commission += tx.barberCommissionAmount
        existing.count      += 1
        existing.profit     += txProfit
      } else {
        map.set(tx.barberId, {
          name: tx.barberName,
          revenue: tx.total,
          commission: tx.barberCommissionAmount,
          count: 1,
          profit: txProfit,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [activeTx, txProfitMap])

  // ── Top items (active transactions only) ──────────────────────────────────
  const topServices = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>()
    for (const tx of activeTx) {
      for (const item of tx.items) {
        if (item.type !== "service") continue
        const e = map.get(item.name)
        if (e) { e.count += item.quantity; e.revenue += item.subtotal }
        else map.set(item.name, { name: item.name, count: item.quantity, revenue: item.subtotal })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [activeTx])

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>()
    for (const tx of activeTx) {
      for (const item of tx.items) {
        if (item.type !== "product") continue
        const e = map.get(item.name)
        if (e) { e.count += item.quantity; e.revenue += item.subtotal }
        else map.set(item.name, { name: item.name, count: item.quantity, revenue: item.subtotal })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [activeTx])

  const topMinibar = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>()
    for (const tx of activeTx) {
      for (const item of tx.items) {
        if (item.type !== "minibar") continue
        const e = map.get(item.name)
        if (e) { e.count += item.quantity; e.revenue += item.subtotal }
        else map.set(item.name, { name: item.name, count: item.quantity, revenue: item.subtotal })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [activeTx])

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(displayTx.length / PAGE_SIZE))
  const pageTx = displayTx.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const maxRevenue = Math.max(...barberStats.map((b) => b.revenue), 1)

  const hasFilters = !!(
    search || barberFilter !== "all" || paymentFilter !== "all" ||
    productFilter !== "all" || minibarFilter !== "all" || statusFilter !== "all"
  )

  const clearFilters = () => {
    setSearch("")
    setBarberFilter("all")
    setPaymentFilter("all")
    setProductFilter("all")
    setMinibarFilter("all")
    setStatusFilter("all")
  }

  return (
    <>
      {/* ── Page heading ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-black tracking-tight">التقارير والإحصائيات</h1>
          <p className="text-[13px] text-black/40 mt-0.5">تحليل أداء المبيعات والإيرادات</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — إحصائيات متقدمة (RPC-powered, server-aggregated)
      ════════════════════════════════════════════════════════════════════════ */}

      {/* Analytics range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-black">الإحصائيات المجمّعة</p>
          <p className="text-[11px] text-black/40 mt-0.5">بيانات مُعالَجة من قاعدة البيانات مباشرةً</p>
        </div>
        <Tabs
          value={analyticsRange}
          onValueChange={(v) => setAnalyticsRange(v as AnalyticsRange)}
        >
          <TabsList>
            <TabsTrigger value="day">يومي</TabsTrigger>
            <TabsTrigger value="week">أسبوعي</TabsTrigger>
            <TabsTrigger value="month">شهري</TabsTrigger>
            <TabsTrigger value="custom">مخصص</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Custom date inputs — only visible when "مخصص" is active */}
      {analyticsRange === "custom" && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-black/50 font-medium whitespace-nowrap">من:</span>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 text-[12px] w-40"
              max={customEnd || undefined}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-black/50 font-medium whitespace-nowrap">إلى:</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 text-[12px] w-40"
              min={customStart || undefined}
            />
          </div>
          {(!customStart || !customEnd || customStart > customEnd) && (
            <p className="text-[11px] text-amber-600">حدد نطاقاً زمنياً صحيحاً لتحميل البيانات</p>
          )}
        </div>
      )}

      {/* ── 5 KPI summary cards ──────────────────────────────────────────────── */}
      {analyticsError ? (
        <div className="bg-rose-50 rounded-2xl ring-1 ring-rose-200 px-5 py-4">
          <p className="text-[13px] text-rose-600 font-medium">
            تعذّر تحميل الإحصائيات: {analyticsError}
          </p>
        </div>
      ) : analyticsLoading ? (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl ring-1 ring-black/[0.06] p-5">
              <Skeleton className="w-7 h-7 rounded-lg mb-3" />
              <Skeleton className="h-2.5 w-20 mb-3" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {(
            [
              { label: "إجمالي الإيرادات",      value: formatIQD(analytics.total_revenue),    icon: TrendingUp },
              { label: "مبيعات الميني بار",      value: formatIQD(analytics.minibar_revenue),  icon: Coffee     },
              { label: "عوائد الخدمات",          value: formatIQD(analytics.services_revenue), icon: Scissors   },
              { label: "إجمالي العمولات المستحقة", value: formatIQD(analytics.total_commissions), icon: Users   },
              { label: "عدد الفواتير",           value: String(analytics.invoice_count),       icon: Receipt    },
            ] as const
          ).map((card) => (
            <div key={card.label} className="bg-white rounded-2xl ring-1 ring-black/[0.06] p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-rivo-green/[0.08] flex items-center justify-center flex-shrink-0">
                  <card.icon className="w-3.5 h-3.5 text-rivo-green" strokeWidth={2} />
                </div>
                <p className="text-[11px] text-black/40 font-medium leading-tight">{card.label}</p>
              </div>
              <p className="text-[20px] font-bold tabular-nums leading-none text-black">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Barber performance table (RPC) ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.05]">
          <h3 className="text-[14px] font-semibold text-black">أداء الحلاقين</h3>
          <p className="text-[11px] text-black/40 mt-0.5">مُجمَّع للفترة المحددة من قاعدة البيانات</p>
        </div>

        {analyticsLoading ? (
          /* Loading skeleton rows */
          <div className="divide-y divide-black/[0.04]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-4 grid gap-4"
                   style={{ gridTemplateColumns: "32px 1fr 160px 160px 100px" }}>
                <Skeleton className="w-6 h-6 rounded-md" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        ) : barberPerf.length === 0 ? (
          /* Empty state */
          <div className="py-14 text-center">
            <Users className="w-8 h-8 text-black/20 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[13px] text-black/30">لا توجد بيانات لهذه الفترة</p>
          </div>
        ) : (
          <>
            {/* Table header — hidden on mobile */}
            <div
              className="hidden sm:grid px-5 py-3 border-b border-black/[0.05] bg-black/[0.015]"
              style={{ gridTemplateColumns: "32px 1fr 160px 160px 100px" }}
            >
              {["#", "الحلاق", "إجمالي الإيراد", "العمولة المستحقة", "عدد الخدمات"].map((h) => (
                <p key={h} className="text-[11px] font-bold text-black/35 uppercase tracking-wide">
                  {h}
                </p>
              ))}
            </div>

            {/* Table rows */}
            <div className="divide-y divide-black/[0.04]">
              {barberPerf.map((b, i) => (
                <div
                  key={b.barber_name}
                  className="px-5 py-4 hover:bg-black/[0.012] transition-colors"
                >
                  {/* Desktop row */}
                  <div
                    className="hidden sm:grid items-center gap-4"
                    style={{ gridTemplateColumns: "32px 1fr 160px 160px 100px" }}
                  >
                    <span className="w-6 h-6 rounded-md bg-rivo-green/[0.08] flex items-center justify-center text-[10px] font-bold text-rivo-green flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-[13px] font-semibold text-black truncate">{b.barber_name}</p>
                    <p className="text-[13px] font-bold text-black tabular-nums">
                      {formatIQD(b.total_revenue)}
                    </p>
                    <p className="text-[12px] text-black/55 tabular-nums">
                      {formatIQD(b.commission)}
                    </p>
                    <p className="text-[12px] text-black/45 tabular-nums">{b.services_count} خدمة</p>
                  </div>

                  {/* Mobile card */}
                  <div className="sm:hidden space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-rivo-green/[0.08] flex items-center justify-center text-[10px] font-bold text-rivo-green flex-shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-[13px] font-semibold text-black truncate">
                          {b.barber_name}
                        </p>
                      </div>
                      <p className="text-[13px] font-bold text-black tabular-nums flex-shrink-0">
                        {formatIQD(b.total_revenue)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mr-7">
                      <p className="text-[11px] text-black/45">
                        عمولة: {formatIQD(b.commission)}
                      </p>
                      <p className="text-[11px] text-black/45">{b.services_count} خدمة</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — سجل المعاملات (Zustand local data)
      ════════════════════════════════════════════════════════════════════════ */}

      {/* Section divider */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-black/[0.05]" />
        <p className="text-[11px] text-black/30 font-medium whitespace-nowrap">سجل المعاملات المحلي</p>
        <div className="flex-1 h-px bg-black/[0.05]" />
      </div>

      {/* Period tabs */}
      <Tabs value={period} onValueChange={(v) => { setPeriod(v as PeriodTab); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="today">اليوم</TabsTrigger>
          <TabsTrigger value="week">هذا الأسبوع</TabsTrigger>
          <TabsTrigger value="month">هذا الشهر</TabsTrigger>
          <TabsTrigger value="all">الكل</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── KPI cards (active transactions only) ──────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "إجمالي الإيرادات",
            value: formatIQD(kpis.revenue),
            icon: TrendingUp,
            accent: "",
          },
          {
            label: "صافي الربح",
            value: formatIQD(kpis.totalProfit),
            icon: BarChart3,
            accent: kpis.totalProfit >= 0 ? "text-emerald-600" : "text-rose-500",
          },
          {
            label: "إجمالي العمولات",
            value: formatIQD(kpis.commission),
            icon: Users,
            accent: "",
          },
          {
            label: "عدد المعاملات",
            value: String(kpis.count),
            icon: Receipt,
            accent: "",
          },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl ring-1 ring-black/[0.06] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-rivo-green/[0.08] flex items-center justify-center">
                <k.icon className="w-3.5 h-3.5 text-rivo-green" strokeWidth={2} />
              </div>
              <p className="text-[11px] text-black/40 font-medium">{k.label}</p>
            </div>
            <p className={cn(
              "text-[20px] font-bold tabular-nums leading-none",
              k.accent || "text-black"
            )}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Analytics grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_310px] gap-4">
        {/* Barber performance */}
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] p-5">
          <h3 className="text-[14px] font-semibold text-black mb-4">أداء الحلاقين</h3>
          {barberStats.length === 0 ? (
            <p className="text-[13px] text-black/30 text-center py-8">لا توجد بيانات</p>
          ) : (
            <div className="space-y-4">
              {barberStats.map((b, i) => (
                <div key={b.name}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-rivo-green/[0.08] flex items-center justify-center text-[10px] font-bold text-rivo-green flex-shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-[13px] font-medium text-black/70 leading-tight">{b.name}</p>
                        <p className="text-[10px] text-black/35">{b.count} معاملة</p>
                      </div>
                    </div>
                    <div className="text-left space-y-0.5">
                      <p className="text-[12px] font-bold text-black tabular-nums">
                        {formatIQD(b.revenue)}
                      </p>
                      <p className="text-[10px] text-black/40 tabular-nums">
                        عمولة: {formatIQD(b.commission)}
                      </p>
                      <p className={cn(
                        "text-[10px] font-semibold tabular-nums",
                        b.profit >= 0 ? "text-emerald-600" : "text-rose-500"
                      )}>
                        صافي: {formatIQD(b.profit)}
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-black/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rivo-green transition-all"
                      style={{ width: `${(b.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top items — three panels stacked */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] p-5">
            <h3 className="text-[13px] font-semibold text-black mb-3 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-rivo-green" strokeWidth={2} />
              أفضل الخدمات
            </h3>
            <TopItemsList items={topServices} emptyLabel="لا توجد خدمات" />
          </div>
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] p-5">
            <h3 className="text-[13px] font-semibold text-black mb-3 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-rivo-green" strokeWidth={2} />
              أفضل المنتجات
            </h3>
            <TopItemsList items={topProducts} emptyLabel="لا توجد مبيعات منتجات" />
          </div>
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] p-5">
            <h3 className="text-[13px] font-semibold text-black mb-3 flex items-center gap-2">
              <Coffee className="w-3.5 h-3.5 text-rivo-green" strokeWidth={2} />
              أفضل الميني بار
            </h3>
            <TopItemsList items={topMinibar} emptyLabel="لا توجد مبيعات ميني بار" />
          </div>
        </div>
      </div>

      {/* ── Transaction history table ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
        {/* Table filters */}
        <div className="px-5 py-4 border-b border-black/[0.05] space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <h3 className="text-[14px] font-semibold text-black sm:ml-auto">سجل المعاملات</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-black/30 pointer-events-none" strokeWidth={1.8} />
                <Input
                  dir="rtl"
                  placeholder="بحث برقم الفاتورة أو العميل..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="h-8 w-48 text-[12px] pr-8"
                />
              </div>
              <Select value={barberFilter} onValueChange={(v) => { setBarberFilter(v); setPage(1) }}>
                <SelectTrigger className="h-8 text-[12px] w-32">
                  <SelectValue placeholder="الحلاق" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">كل الحلاقين</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1) }}>
                <SelectTrigger className="h-8 text-[12px] w-28">
                  <SelectValue placeholder="الدفع" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">كل الطرق</SelectItem>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="card">بطاقة</SelectItem>
                </SelectContent>
              </Select>
              {/* Status filter */}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1) }}>
                <SelectTrigger className="h-8 text-[12px] w-32">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="completed">مكتملة</SelectItem>
                  <SelectItem value="returned">مُرجعة</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="h-8 text-[12px] gap-1">
                  <X className="w-3 h-3" strokeWidth={2.5} />
                  مسح
                </Button>
              )}
            </div>
          </div>

          {/* Advanced item filters */}
          {(allProductNames.length > 0 || allMinibarNames.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-black/[0.04]">
              <span className="text-[11px] text-black/35 font-medium">تصفية حسب:</span>
              {allProductNames.length > 0 && (
                <Select value={productFilter} onValueChange={(v) => { setProductFilter(v); setPage(1) }}>
                  <SelectTrigger className="h-8 text-[12px] w-40">
                    <SelectValue placeholder="منتج محدد..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كل المنتجات</SelectItem>
                    {allProductNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {allMinibarNames.length > 0 && (
                <Select value={minibarFilter} onValueChange={(v) => { setMinibarFilter(v); setPage(1) }}>
                  <SelectTrigger className="h-8 text-[12px] w-40">
                    <SelectValue placeholder="ميني بار محدد..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كل الميني بار</SelectItem>
                    {allMinibarNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <p className="text-[12px] text-black/40">
            {displayTx.length} معاملة
            {returnedCount > 0 && statusFilter !== "returned" && (
              <span className="text-rose-400 mr-1">({returnedCount} مُرجعة)</span>
            )}
          </p>
        </div>

        {/* Empty state */}
        {pageTx.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-8 h-8 text-black/20 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[13px] text-black/30">
              {hasFilters ? "لا توجد معاملات تطابق الفلتر المحدد" : "لا توجد معاملات في هذه الفترة"}
            </p>
            {!hasFilters && (
              <p className="text-[12px] text-black/20 mt-0.5">
                أكمل أول عملية بيع من نقطة البيع
              </p>
            )}
          </div>
        ) : (
          <>
            {/* ── Desktop header (xl+) — 9 columns ────────────────────────── */}
            <div
              className="hidden xl:grid gap-3 px-5 py-3 border-b border-black/[0.05] bg-black/[0.015]"
              style={{ gridTemplateColumns: "100px 140px 1fr 108px 72px 80px 92px 70px 80px" }}
            >
              {[
                "الفاتورة", "العميل / الحلاق", "البنود",
                "الإجمالي", "الخصم", "العمولة", "الربح", "الدفع",
              ].map((h) => (
                <p key={h} className="text-[11px] font-bold text-black/35 uppercase tracking-wide">
                  {h}
                </p>
              ))}
              <div />
            </div>

            {/* ── Rows ─────────────────────────────────────────────────────── */}
            <div className="divide-y divide-black/[0.04]">
              {pageTx.map((tx) => {
                const txSaleType = getTxSaleType(tx)
                const profit = txProfitMap.get(tx.id) ?? 0
                const barberDisplay = tx.barberName || "بيع عام"
                const isReturned = tx.status === "returned"
                const dateStr = new Date(tx.createdAt).toLocaleDateString("ar-IQ", {
                  day: "numeric", month: "numeric", year: "2-digit",
                })

                const serviceItems    = tx.items.filter((i) => i.type === "service")
                const productItems    = tx.items.filter((i) => i.type === "product")
                const minibarTxItems  = tx.items.filter((i) => i.type === "minibar")
                const allDisplayItems = [...serviceItems, ...productItems, ...minibarTxItems]
                const ITEM_LIMIT = 4
                const shownItems = allDisplayItems.slice(0, ITEM_LIMIT)
                const extraCount = Math.max(0, allDisplayItems.length - ITEM_LIMIT)

                return (
                  <div
                    key={tx.id}
                    className={cn(
                      "hover:bg-black/[0.012] transition-colors",
                      isReturned && "opacity-60"
                    )}
                  >
                    {/* ── Desktop row (xl+) ─────────────────────────────── */}
                    <div
                      className="hidden xl:grid gap-3 px-5 py-4 items-start"
                      style={{ gridTemplateColumns: "100px 140px 1fr 108px 72px 80px 92px 70px 80px" }}
                    >
                      {/* 1 — Invoice info */}
                      <div className="space-y-1 min-w-0">
                        <p className="text-[12px] font-bold text-rivo-green tabular-nums leading-tight">
                          {tx.id}
                        </p>
                        <p className="text-[10px] text-black/40 tabular-nums">{dateStr}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          <SaleTypePill type={txSaleType} />
                          {isReturned && (
                            <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none bg-rose-50 text-rose-500">
                              مُرجع
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2 — Client / Barber */}
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-[12px] font-semibold text-black truncate leading-tight">
                          {tx.clientName}
                        </p>
                        <p className="text-[11px] text-black/40 truncate">{barberDisplay}</p>
                      </div>

                      {/* 3 — Items breakdown */}
                      <div className="min-w-0 space-y-1">
                        {shownItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-1.5 min-w-0">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0 mt-px",
                              ITEM_DOT[item.type]
                            )} />
                            <span className="text-[11px] text-black/60 truncate leading-tight">
                              {item.name}
                              {item.quantity > 1 && (
                                <span className="text-black/35 ml-0.5">×{item.quantity}</span>
                              )}
                            </span>
                          </div>
                        ))}
                        {extraCount > 0 && (
                          <p className="text-[10px] text-black/30 mr-3">+{extraCount} عنصر آخر</p>
                        )}
                      </div>

                      {/* 4 — Total */}
                      <p className={cn(
                        "text-[13px] font-bold tabular-nums pt-0.5",
                        isReturned ? "line-through text-black/40" : "text-black"
                      )}>
                        {formatIQD(tx.total)}
                      </p>

                      {/* 5 — Discount */}
                      <p className={cn(
                        "text-[12px] tabular-nums pt-0.5",
                        tx.discountAmount > 0 ? "text-emerald-600 font-medium" : "text-black/25"
                      )}>
                        {tx.discountAmount > 0 ? `‒ ${formatIQD(tx.discountAmount)}` : "—"}
                      </p>

                      {/* 6 — Commission */}
                      <p className={cn(
                        "text-[12px] tabular-nums pt-0.5",
                        tx.barberCommissionAmount > 0 ? "text-black/55" : "text-black/25"
                      )}>
                        {tx.barberCommissionAmount > 0 ? formatIQD(tx.barberCommissionAmount) : "—"}
                      </p>

                      {/* 7 — Profit (0 for returned invoices) */}
                      <p className={cn(
                        "text-[13px] font-semibold tabular-nums pt-0.5",
                        isReturned ? "text-black/25" : profit >= 0 ? "text-emerald-600" : "text-rose-500"
                      )}>
                        {isReturned ? "—" : `${profit >= 0 ? "" : "‒ "}${formatIQD(Math.abs(profit))}`}
                      </p>

                      {/* 8 — Payment */}
                      <div className="pt-0.5">
                        <Badge variant={tx.paymentMethod === "cash" ? "active" : "outline"}>
                          {tx.paymentMethod === "cash" ? "نقداً" : "بطاقة"}
                        </Badge>
                      </div>

                      {/* 9 — Actions */}
                      <div className="pt-0.5 flex items-center justify-end gap-0.5">
                        {isReturned ? (
                          <span className="text-[10px] font-medium text-rose-400/70 bg-rose-50 px-1.5 py-0.5 rounded-full">
                            مُرجع
                          </span>
                        ) : (
                          <>
                            {canReturn && (
                              <button
                                type="button"
                                onClick={() => setPendingReturnId(tx.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-black/25 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                title="إرجاع الفاتورة"
                              >
                                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.8} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(tx.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-black/25 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                title="حذف نهائي"
                              >
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* ── Card layout (< xl) ────────────────────────────── */}
                    <div className="xl:hidden px-5 py-4 space-y-2.5">
                      {/* Row 1: Invoice ID + amount */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[12px] font-bold text-rivo-green tabular-nums">
                            {tx.id}
                          </p>
                          <SaleTypePill type={txSaleType} />
                          {isReturned && (
                            <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none bg-rose-50 text-rose-500">
                              مُرجع
                            </span>
                          )}
                          <p className="text-[11px] text-black/35 tabular-nums">{dateStr}</p>
                        </div>
                        <div className="text-left flex-shrink-0">
                          <p className={cn(
                            "text-[14px] font-bold tabular-nums",
                            isReturned ? "line-through text-black/40" : "text-black"
                          )}>
                            {formatIQD(tx.total)}
                          </p>
                          <div className="flex justify-end items-center gap-1.5 mt-0.5">
                            <Badge variant={tx.paymentMethod === "cash" ? "active" : "outline"}>
                              {tx.paymentMethod === "cash" ? "نقداً" : "بطاقة"}
                            </Badge>
                            {!isReturned && canReturn && (
                              <button
                                type="button"
                                onClick={() => setPendingReturnId(tx.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-black/20 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                title="إرجاع"
                              >
                                <RotateCcw className="w-3 h-3" strokeWidth={1.8} />
                              </button>
                            )}
                            {!isReturned && canDelete && (
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(tx.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-black/20 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" strokeWidth={1.8} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Client + profit */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-black truncate">
                            {tx.clientName}
                          </p>
                          <p className="text-[11px] text-black/40">{barberDisplay}</p>
                        </div>
                        {!isReturned && (
                          <div className="text-left flex-shrink-0 space-y-0.5">
                            <p className={cn(
                              "text-[12px] font-semibold tabular-nums",
                              profit >= 0 ? "text-emerald-600" : "text-rose-500"
                            )}>
                              ربح: {formatIQD(profit)}
                            </p>
                            {tx.discountAmount > 0 && (
                              <p className="text-[11px] text-black/35 tabular-nums">
                                خصم: {formatIQD(tx.discountAmount)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Row 3: Items */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {shownItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-1">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              ITEM_DOT[item.type]
                            )} />
                            <span className="text-[11px] text-black/55">
                              {item.name}
                              {item.quantity > 1 && (
                                <span className="text-black/30"> ×{item.quantity}</span>
                              )}
                            </span>
                          </div>
                        ))}
                        {extraCount > 0 && (
                          <span className="text-[11px] text-black/30">+{extraCount} آخر</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-black/[0.05]">
                <p className="text-[12px] text-black/40">
                  صفحة {page} من {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Return confirmation dialog ─────────────────────────────────────── */}
      <AlertDialog
        open={!!pendingReturnId}
        onOpenChange={(open) => { if (!open) setPendingReturnId(null) }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إرجاع الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد إرجاع الفاتورة{pendingReturnId ? ` ${pendingReturnId}` : ""}؟
              سيتم استعادة المخزون فوراً وتحديث حالة الفاتورة إلى مُرجعة.
              لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleReturn}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              تأكيد الإرجاع
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null) }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الفاتورة نهائياً</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد حذف الفاتورة{pendingDeleteId ? ` ${pendingDeleteId}` : ""} نهائياً؟
              لن يتم استعادة المخزون. هذا الإجراء للتصحيح الإداري فقط ولا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              حذف نهائياً
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
