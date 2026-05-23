"use client"

import { useState } from "react"
import { Bell, Search } from "lucide-react"
import { useRivoStore, useNotifications } from "@/lib/store"
import { ROLE_LABELS } from "@/lib/auth/types"
import NotificationsDropdown from "./notifications-dropdown"

export default function DashboardHeader() {
  const currentSession = useRivoStore((s) => s.currentSession)
  const { unreadCount } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)

  const displayName = currentSession?.name ?? "—"
  const displayRole = currentSession ? ROLE_LABELS[currentSession.role] : ""
  const initial = displayName.charAt(0)

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-black/[0.05] flex items-center justify-between px-6 gap-4 sticky top-0 z-20 flex-shrink-0">
      {/* Search */}
      <div className="relative w-64">
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 pointer-events-none"
          strokeWidth={1.8}
        />
        <input
          type="search"
          placeholder="بحث سريع..."
          dir="rtl"
          className="w-full h-8 bg-black/[0.04] border border-transparent rounded-lg pr-9 pl-3 text-[13px] text-black placeholder:text-black/30 focus:outline-none focus:border-rivo-green/20 focus:bg-white transition-all"
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <span className="hidden md:block text-[12px] text-black/35 font-medium tabular-nums">
          {new Date().toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>

        <div className="w-px h-4 bg-black/[0.08]" />

        {/* Notifications bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-black/[0.04] hover:bg-black/[0.07] transition-colors"
            aria-label="الإشعارات"
          >
            <Bell className="w-[15px] h-[15px] text-black/50" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-rivo-green rounded-full ring-2 ring-white text-[9px] font-bold text-rivo-cream leading-none px-0.5">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <NotificationsDropdown open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-rivo-green flex items-center justify-center text-rivo-cream text-[11px] font-bold flex-shrink-0">
            {initial}
          </div>
          <div className="hidden sm:block text-right leading-tight">
            <p className="text-[12px] font-semibold text-black">{displayName}</p>
            <p className="text-[10px] text-black/40">{displayRole}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
