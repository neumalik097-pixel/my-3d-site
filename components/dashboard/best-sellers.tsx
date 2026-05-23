"use client"

import { useMemo } from "react"
import { AlertTriangle, Coffee, Package } from "lucide-react"
import { useTransactions, useProducts, useMinibar } from "@/lib/store"
import { formatIQD } from "@/lib/currency"

interface BestItem {
  name: string
  qty: number
  revenue: number
}

function aggregateBestItems(
  transactions: ReturnType<typeof useTransactions>["transactions"],
  type: "service" | "product" | "minibar"
): BestItem[] {
  const map = new Map<string, BestItem>()
  for (const tx of transactions) {
    for (const item of tx.items) {
      if (item.type !== type) continue
      const key = item.itemId || item.name
      const existing = map.get(key) ?? { name: item.name, qty: 0, revenue: 0 }
      map.set(key, {
        name: item.name,
        qty: existing.qty + item.quantity,
        revenue: existing.revenue + item.subtotal,
      })
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  items: BestItem[]
  emptyLabel: string
}

function BestSection({ title, icon, items, emptyLabel }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-rivo-green/[0.08] flex items-center justify-center flex-shrink-0 text-rivo-green">
          {icon}
        </div>
        <h4 className="text-[13px] font-semibold text-black">{title}</h4>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-black/30">{emptyLabel}</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.name} className="flex items-center gap-2">
              <span className="w-5 text-[11px] font-bold text-black/25 text-center flex-shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-black truncate">{item.name}</p>
                <p className="text-[10px] text-black/40">{item.qty} وحدة</p>
              </div>
              <span className="text-[11px] font-semibold text-black/70 flex-shrink-0 tabular-nums">
                {formatIQD(item.revenue)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InventoryAlerts() {
  const { items: products } = useProducts()
  const { items: minibarItems } = useMinibar()

  const alerts = useMemo(() => {
    const allItems = [
      ...products.map((p) => ({ ...p, category: "منتج" as const })),
      ...minibarItems.map((m) => ({ ...m, category: "ميني بار" as const })),
    ]
    return allItems
      .filter((item) => item.status !== "archived" && item.stock <= (item.lowStockThreshold ?? 5))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5)
  }, [products, minibarItems])

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0 text-rose-500">
          <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.8} />
        </div>
        <h4 className="text-[13px] font-semibold text-black">تنبيهات المخزون</h4>
      </div>

      {alerts.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-black/30">المخزون في حالة جيدة</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((item) => {
            const isOut = item.stock === 0
            return (
              <div key={item.id} className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${
                    isOut ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {item.stock}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-black truncate">{item.name}</p>
                  <p className="text-[10px] text-black/40">{item.category}</p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    isOut ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {isOut ? "نافذ" : "منخفض"}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function BestSellers() {
  const { transactions } = useTransactions()

  // Exclude returned invoices from best-sellers analytics
  const activeTx = useMemo(
    () => transactions.filter((tx) => (tx.status ?? "completed") !== "returned"),
    [transactions]
  )

  const [topProducts, topMinibar] = useMemo(
    () => [
      aggregateBestItems(activeTx, "product"),
      aggregateBestItems(activeTx, "minibar"),
    ],
    [activeTx]
  )

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] p-6">
      <div className="mb-5">
        <h3 className="text-[15px] font-semibold text-black">الأكثر مبيعاً</h3>
        <p className="text-[12px] text-black/40 mt-0.5">أعلى العناصر إيراداً بحسب الفئة</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <InventoryAlerts />
        <div className="xl:border-r xl:border-black/[0.05] xl:pr-6">
          <BestSection
            title="أفضل المنتجات"
            icon={<Package className="w-3.5 h-3.5" strokeWidth={1.8} />}
            items={topProducts}
            emptyLabel="لا توجد منتجات مباعة"
          />
        </div>
        <div className="xl:border-r xl:border-black/[0.05] xl:pr-6">
          <BestSection
            title="أفضل الميني بار"
            icon={<Coffee className="w-3.5 h-3.5" strokeWidth={1.8} />}
            items={topMinibar}
            emptyLabel="لا توجد عناصر مباعة"
          />
        </div>
      </div>
    </div>
  )
}
