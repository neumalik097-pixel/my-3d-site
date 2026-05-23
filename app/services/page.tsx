import DashboardShell from "@/components/dashboard/shell"
import { ServicesClient } from "@/components/services/services-client"

export default function ServicesPage() {
  return (
    <DashboardShell>
      <ServicesClient />
    </DashboardShell>
  )
}
