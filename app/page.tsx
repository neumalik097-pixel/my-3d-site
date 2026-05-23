import DashboardShell from "@/components/dashboard/shell"
import StatsGrid from "@/components/dashboard/stats-grid"
import SalesKpiGrid from "@/components/dashboard/sales-kpi-grid"
import BestSellers from "@/components/dashboard/best-sellers"
import AppointmentsPanel from "@/components/dashboard/appointments-panel"
import RecentSales from "@/components/dashboard/recent-sales"

export default function HomePage() {
  return (
    <DashboardShell>
      <div>
        <h1 className="text-[22px] font-bold text-black tracking-tight">
          لوحة التحكم
        </h1>
        <p className="text-[13px] text-black/40 mt-0.5">
          مرحباً بك — إليك ملخص أداء اليوم
        </p>
      </div>

      <StatsGrid />

      <SalesKpiGrid />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <BestSellers />
        <AppointmentsPanel />
      </div>

      <RecentSales />
    </DashboardShell>
  )
}
