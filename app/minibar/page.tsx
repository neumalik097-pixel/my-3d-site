import DashboardShell from "@/components/dashboard/shell"
import { MinibarClient } from "@/components/minibar/minibar-client"

export default function MinibarPage() {
  return (
    <DashboardShell>
      <MinibarClient />
    </DashboardShell>
  )
}
