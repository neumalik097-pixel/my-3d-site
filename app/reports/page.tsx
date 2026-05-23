import DashboardShell from "@/components/dashboard/shell"
import { ReportsClient } from "@/components/reports/reports-client"

export default function ReportsPage() {
  return (
    <DashboardShell>
      <ReportsClient />
    </DashboardShell>
  )
}
