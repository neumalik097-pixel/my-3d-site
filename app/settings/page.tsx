import DashboardShell from "@/components/dashboard/shell"
import { SettingsClient } from "@/components/settings/settings-client"

export default function SettingsPage() {
  return (
    <DashboardShell>
      <div>
        <h1 className="text-[22px] font-bold text-black tracking-tight">الإعدادات</h1>
        <p className="text-[13px] text-black/40 mt-0.5">إدارة إعدادات النظام والصالون</p>
      </div>
      <SettingsClient />
    </DashboardShell>
  )
}
