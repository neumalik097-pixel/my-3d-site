"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Clock, Scissors } from "lucide-react"
import { useAppointments, useTransactions, useServices } from "@/lib/store"
import { APPOINTMENT_STATUS_LABELS } from "@/types/appointment"
import type { AppointmentStatus } from "@/types/appointment"
import { formatIQD } from "@/lib/currency"

const statusDot: Record<AppointmentStatus, string> = {
  pending:   "bg-black/20",
  confirmed: "bg-amber-500",
  completed: "bg-emerald-500",
  cancelled: "bg-rose-400",
  no_show:   "bg-black/30",
}

export default function AppointmentsPanel() {
  const { appointments } = useAppointments()
  const { transactions } = useTransactions()
  const { services } = useServices()

  const today = new Date().toISOString().slice(0, 10)

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.date === today)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]
  )

  const inProgressCount = useMemo(
    () => todayAppointments.filter((a) => a.status === "confirmed").length,
    [todayAppointments]
  )

  const topServices = useMemo(() => {
    const activeTx = transactions.filter((tx) => (tx.status ?? "completed") !== "returned")
    const map = new Map<string, { name: string; revenue: number }>()
    for (const tx of activeTx) {
      for (const item of tx.items) {
        if (item.type !== "service") continue
        const key = item.itemId || item.name
        const existing = map.get(key) ?? { name: item.name, revenue: 0 }
        map.set(key, { name: item.name, revenue: existing.revenue + item.subtotal })
      }
    }
    const sorted = Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
    const maxRevenue = sorted[0]?.revenue ?? 1
    return sorted.map((s) => ({
      ...s,
      pct: Math.round((s.revenue / maxRevenue) * 100),
    }))
  }, [transactions])

  const getServiceNames = (serviceIds: string[]) => {
    const names = serviceIds
      .map((id) => services.find((s) => s.id === id)?.name)
      .filter(Boolean) as string[]
    return names.length > 0 ? names.join(" + ") : "—"
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Today's appointments */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
          <div>
            <h3 className="text-[15px] font-semibold text-black">مواعيد اليوم</h3>
            <p className="text-[12px] text-black/40 mt-0.5">{todayAppointments.length} موعد مجدول</p>
          </div>
          {inProgressCount > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {inProgressCount} جاري الآن
            </div>
          )}
        </div>

        {todayAppointments.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-black/30">
            لا توجد مواعيد اليوم
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            {todayAppointments.map((apt, i) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.3 }}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-black/[0.015] transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rivo-green/[0.08] flex items-center justify-center text-[12px] font-bold text-rivo-green">
                  {apt.clientName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-black truncate">
                    {apt.clientName}
                  </p>
                  <p className="text-[11px] text-black/40 truncate">
                    {getServiceNames(apt.serviceIds)}
                  </p>
                </div>
                <div className="text-left flex-shrink-0">
                  <div className="flex items-center gap-1 text-[11px] text-black/50 justify-end">
                    <Clock className="w-3 h-3" strokeWidth={1.8} />
                    {apt.time}
                  </div>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot[apt.status]}`} />
                    <span className="text-[10px] text-black/40">
                      {APPOINTMENT_STATUS_LABELS[apt.status]}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Top services — live from completed transactions */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-black">أفضل الخدمات</h3>
          <Scissors className="w-4 h-4 text-black/25" strokeWidth={1.8} />
        </div>
        {topServices.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-black/30">
            لا توجد خدمات مباعة بعد
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {topServices.map((s, i) => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-medium text-black/70 truncate">{s.name}</span>
                  <span className="text-[11px] font-semibold text-black/50 flex-shrink-0 mr-2 tabular-nums">
                    {formatIQD(s.revenue)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-black/[0.05] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{
                      delay: 0.4 + i * 0.1,
                      duration: 0.6,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                    className="h-full rounded-full bg-rivo-green"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
