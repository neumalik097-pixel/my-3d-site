import DashboardShell from "@/components/dashboard/shell"
import { BarbersClient } from "@/components/barbers/barbers-client"

export default function BarbersPage() {
  return (
    <DashboardShell>
      <BarbersClient />
    </DashboardShell>
  )
}
