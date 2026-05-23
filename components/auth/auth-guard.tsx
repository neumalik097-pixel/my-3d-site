"use client"

// AuthGuard is the client-side authentication gate and layout shell.
// It renders the full dashboard layout (sidebar + header + content) only for
// authenticated users with the correct route permissions.
//
// Migration note: the auth check logic (canAccessRoute + session presence) maps
// directly to Next.js Middleware matcher rules — no structural refactor needed
// when migrating to Supabase Auth.

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Scissors } from "lucide-react"
import { useRivoStore } from "@/lib/store"
import { canAccessRoute } from "@/lib/auth/permissions"
import Sidebar from "@/components/dashboard/sidebar"
import DashboardHeader from "@/components/dashboard/header"
import { AccessDenied } from "./access-denied"

interface AuthGuardProps {
  children: React.ReactNode
  fullHeight?: boolean
}

export function AuthGuard({ children, fullHeight }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const hydrated = useRivoStore((s) => s._hydrated)
  const currentSession = useRivoStore((s) => s.currentSession)

  // Redirect unauthenticated users to login once the store is ready
  useEffect(() => {
    if (!hydrated) return
    if (!currentSession) {
      router.replace("/login")
    }
  }, [hydrated, currentSession, router])

  // ── Phase 1: Store is hydrating from localStorage ────────────────────────────
  // Render a full-screen branded loader to prevent any content flash.
  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-rivo-cream">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rivo-green/10 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-rivo-green animate-pulse" strokeWidth={2} />
          </div>
          <p className="text-[13px] text-black/40 font-medium">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  // ── Phase 2: Hydrated but no session — redirect underway ─────────────────────
  if (!currentSession) return null

  // ── Phase 3: Authenticated — check route-level permission ────────────────────
  const hasAccess = canAccessRoute(currentSession.role, pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-rivo-cream">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <DashboardHeader />
        <main
          className={
            fullHeight
              ? "flex-1 overflow-hidden flex flex-col"
              : "flex-1 overflow-y-auto p-6 space-y-6"
          }
        >
          {hasAccess ? children : <AccessDenied />}
        </main>
      </div>
    </div>
  )
}
