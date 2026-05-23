"use client"

import { useMemo } from "react"
import { Banknote, CalendarCheck, Users, CheckCircle2 } from "lucide-react"
import StatCard from "@/components/dashboard/stat-card"
import { useTransactions, useAppointments, useClients } from "@/lib/store"
import { formatIQD } from "@/lib/currency"

export default function StatsGrid() {
  const { transactions } = useTransactions()
  const { appointments } = useAppointments()
  const { clients } = useClients()

  const today = new Date().toISOString().slice(0, 10)

  const stats = useMemo(() => {
    const activeTx = transactions.filter((tx) => (tx.status ?? "completed") !== "returned")
    const netProfit = Math.round(activeTx.reduce((s, tx) => s + tx.total - (tx.barberCommissionAmount ?? 0), 0))
    const todayAppointments = appointments.filter((a) => a.date === today).length
    const totalClients = clients.length
    const completed = appointments.filter((a) => a.status === "completed").length
    const total = appointments.length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return [
      {
        title: "صافي الأرباح",
        value: netProfit < 0 ? `‒ ${formatIQD(Math.abs(netProfit))}` : formatIQD(netProfit),
        suffix: "",
        change: `${activeTx.length} معاملة`,
        trend: netProfit >= 0 ? ("up" as const) : ("down" as const),
        icon: Banknote,
      },
      {
        title: "مواعيد اليوم",
        value: String(todayAppointments),
        suffix: "موعد",
        change: `${appointments.length} إجمالي`,
        trend: "up" as const,
        icon: CalendarCheck,
      },
      {
        title: "إجمالي العملاء",
        value: String(totalClients),
        suffix: "عميل",
        change: "قاعدة العملاء",
        trend: "up" as const,
        icon: Users,
      },
      {
        title: "معدل الإتمام",
        value: String(completionRate),
        suffix: "٪",
        change: `${completed} مكتمل`,
        trend: completionRate >= 70 ? ("up" as const) : ("down" as const),
        icon: CheckCircle2,
      },
    ]
  }, [transactions, appointments, clients, today]) // transactions needed for activeTx derivation

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <StatCard key={s.title} {...s} index={i} />
      ))}
    </div>
  )
}
