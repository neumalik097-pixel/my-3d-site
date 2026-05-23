import DashboardShell from "@/components/dashboard/shell"
import { POSClient } from "@/components/pos/pos-client"

export default function POSPage() {
  return (
    <DashboardShell fullHeight>
      <POSClient />
    </DashboardShell>
  )
}
