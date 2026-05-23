"use client"

import { useMemo } from "react"
import { Coffee, Package, Scissors, TrendingUp } from "lucide-react"
import StatCard from "@/components/dashboard/stat-card"
import { useTransactions } from "@/lib/store"
import { formatIQD } from "@/lib/currency"

export default function SalesKpiGrid() {
  const { transactions } = useTransactions()

  // Exclude returned invoices from all financial KPIs
  const activeTx = useMemo(
    () => transactions.filter((tx) => (tx.status ?? "completed") !== "returned"),
    [transactions]
  )

  const stats = useMemo(() => {
    let minibarTotal = 0
    let productsTotal = 0
    let servicesTotal = 0
    let combinedTotal = 0

    for (const tx of activeTx) {
      combinedTotal += tx.total
      for (const item of tx.items) {
        if (item.type === "minibar")  minibarTotal  += item.subtotal
        if (item.type === "product")  productsTotal += item.subtotal
        if (item.type === "service")  servicesTotal += item.subtotal
      }
    }

    return [
      {
        title: "إجمالي مبيعات الميني بار",
        value: formatIQD(minibarTotal),
        suffix: "",
        change: `${activeTx.filter((tx) => tx.items.some((i) => i.type === "minibar")).length} فاتورة`,
        trend: "up" as const,
        icon: Coffee,
      },
      {
        title: "إجمالي مبيعات المنتجات",
        value: formatIQD(productsTotal),
        suffix: "",
        change: `${activeTx.filter((tx) => tx.items.some((i) => i.type === "product")).length} فاتورة`,
        trend: "up" as const,
        icon: Package,
      },
      {
        title: "إجمالي مبيعات الحلاقين",
        value: formatIQD(servicesTotal),
        suffix: "",
        change: `${activeTx.filter((tx) => tx.items.some((i) => i.type === "service")).length} فاتورة`,
        trend: "up" as const,
        icon: Scissors,
      },
      {
        title: "إجمالي المبيعات",
        value: formatIQD(combinedTotal),
        suffix: "",
        change: `${activeTx.length} معاملة`,
        trend: "up" as const,
        icon: TrendingUp,
      },
    ]
  }, [activeTx])

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <StatCard key={s.title} {...s} index={i} />
      ))}
    </div>
  )
}
