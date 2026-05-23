import DashboardShell from "@/components/dashboard/shell"
import { ClientsClient } from "@/components/clients/clients-client"

export default function ClientsPage() {
  return (
    <DashboardShell>
      <ClientsClient />
    </DashboardShell>
  )
}
