import DashboardShell from "@/components/dashboard/shell"
import { AppointmentsClient } from "@/components/appointments/appointments-client"

export default function AppointmentsPage() {
  return (
    <DashboardShell>
      <AppointmentsClient />
    </DashboardShell>
  )
}
