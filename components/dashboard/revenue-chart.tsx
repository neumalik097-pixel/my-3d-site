"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { useTransactions } from "@/lib/store"
import { formatIQD } from "@/lib/currency"

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
]

function getLast7Months(): Array<{ key: string; label: string }> {
  const result = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    result.push({ key, label: ARABIC_MONTHS[d.getMonth()] })
  }
  return result
}

function fmtYAxis(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${Math.round(val / 1_000)}K`
  return String(Math.round(val))
}

export default function RevenueChart() {
  const { transactions } = useTransactions()

  const months = useMemo(() => getLast7Months(), [])

  const monthlyData = useMemo(() => {
    const activeTx = transactions.filter((tx) => (tx.status ?? "completed") !== "returned")
    const revenueByMonth = new Map<string, number>()
    for (const tx of activeTx) {
      const key = tx.createdAt.slice(0, 7)
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + tx.total)
    }
    return months.map((m) => ({
      key: m.key,
      label: m.label,
      revenue: revenueByMonth.get(m.key) ?? 0,
    }))
  }, [transactions, months])

  const maxRevenue = useMemo(
    () => Math.max(...monthlyData.map((d) => d.revenue), 0),
    [monthlyData]
  )

  const scaleMax = useMemo(() => (maxRevenue > 0 ? maxRevenue * 1.2 : 1), [maxRevenue])

  const avgRevenue = useMemo(
    () => Math.round(monthlyData.reduce((s, d) => s + d.revenue, 0) / 7),
    [monthlyData]
  )

  const avgPct = scaleMax > 0 ? (avgRevenue / scaleMax) * 100 : 0

  const yLabels = useMemo(
    () => [scaleMax, scaleMax * 0.75, scaleMax * 0.5, scaleMax * 0.25, 0].map(fmtYAxis),
    [scaleMax]
  )

  const summary = useMemo(() => {
    const highest = monthlyData.reduce(
      (best, d) => (d.revenue > best.revenue ? d : best),
      monthlyData[0] ?? { label: "—", revenue: 0 }
    )
    const last = monthlyData[monthlyData.length - 1]?.revenue ?? 0
    const prev = monthlyData[monthlyData.length - 2]?.revenue ?? 0
    const growth = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null
    return { highest, growth }
  }, [monthlyData])

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-semibold text-black">تحليل الإيرادات</h3>
          <p className="text-[12px] text-black/40 mt-0.5">آخر ٧ أشهر</p>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-medium text-black/50">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-rivo-green" />
            <span>الإيرادات</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-rivo-green/20 border border-rivo-green/30" />
            <span>المتوسط</span>
          </div>
        </div>
      </div>

      {/* Y-axis labels + Bars */}
      <div className="flex gap-3 flex-1">
        {/* Y labels */}
        <div className="flex flex-col justify-between text-[10px] text-black/25 font-medium text-left pb-6 w-7 flex-shrink-0">
          {yLabels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Grid lines */}
          <div className="relative flex-1">
            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute w-full border-t border-black/[0.04]"
                style={{ bottom: `${pct}%` }}
              />
            ))}

            {/* Average reference line */}
            {avgRevenue > 0 && (
              <div
                className="absolute w-full border-t-2 border-dashed border-rivo-green/20"
                style={{ bottom: `${avgPct}%` }}
              />
            )}

            {/* Bars */}
            <div className="absolute inset-0 flex items-end gap-2 px-1">
              {monthlyData.map((d, i) => {
                const barHeight = scaleMax > 0 ? (d.revenue / scaleMax) * 100 : 0
                return (
                  <div key={d.key} className="flex-1 flex flex-col items-center justify-end h-full relative">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${barHeight}%` }}
                      transition={{
                        delay: 0.2 + i * 0.07,
                        duration: 0.55,
                        ease: [0.34, 1.2, 0.64, 1],
                      }}
                      className="w-full rounded-t-md bg-rivo-green relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
                    </motion.div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* X labels */}
          <div className="flex gap-2 px-1">
            {monthlyData.map((d) => (
              <div key={d.key} className="flex-1 text-center text-[10px] text-black/35 font-medium truncate">
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="mt-4 pt-4 border-t border-black/[0.05] grid grid-cols-3 gap-4">
        {[
          {
            label: "أعلى شهر",
            value: summary.highest.revenue > 0 ? summary.highest.label : "—",
            sub: summary.highest.revenue > 0 ? formatIQD(summary.highest.revenue) : "لا توجد بيانات",
          },
          {
            label: "متوسط شهري",
            value: avgRevenue > 0 ? formatIQD(avgRevenue) : "—",
            sub: "آخر ٧ أشهر",
          },
          {
            label: "نمو المبيعات",
            value:
              summary.growth !== null
                ? `${summary.growth >= 0 ? "+" : ""}${summary.growth}%`
                : "—",
            sub: "مقارنة بالشهر الماضي",
          },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-[10px] text-black/35 font-medium mb-0.5">{s.label}</p>
            <p className="text-[13px] font-bold text-black">{s.value}</p>
            <p className="text-[10px] text-black/40">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
