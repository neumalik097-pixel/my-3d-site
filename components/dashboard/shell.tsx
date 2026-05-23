import { AuthGuard } from "@/components/auth/auth-guard"

export default function DashboardShell({
  children,
  fullHeight,
}: {
  children: React.ReactNode
  fullHeight?: boolean
}) {
  return <AuthGuard fullHeight={fullHeight}>{children}</AuthGuard>
}
