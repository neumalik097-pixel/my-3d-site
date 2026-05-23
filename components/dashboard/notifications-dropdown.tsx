"use client"

import { useRef, useEffect } from "react"
import { Bell, X, CalendarCheck, Package, ShoppingCart, Archive, KeyRound, User, CheckCheck } from "lucide-react"
import { useNotifications } from "@/lib/store"
import type { NotificationType } from "@/lib/stores/types"
import { cn } from "@/lib/utils"

function typeIcon(type: NotificationType) {
  switch (type) {
    case "appointment":  return <CalendarCheck className="w-3.5 h-3.5" strokeWidth={1.8} />
    case "low_stock":    return <Package className="w-3.5 h-3.5" strokeWidth={1.8} />
    case "sale":         return <ShoppingCart className="w-3.5 h-3.5" strokeWidth={1.8} />
    case "user_archived":return <Archive className="w-3.5 h-3.5" strokeWidth={1.8} />
    case "password_change": return <KeyRound className="w-3.5 h-3.5" strokeWidth={1.8} />
    case "profile_update":  return <User className="w-3.5 h-3.5" strokeWidth={1.8} />
  }
}

function typeColor(type: NotificationType) {
  switch (type) {
    case "appointment":  return "bg-blue-50 text-blue-600"
    case "low_stock":    return "bg-amber-50 text-amber-600"
    case "sale":         return "bg-emerald-50 text-emerald-600"
    case "user_archived":return "bg-black/[0.05] text-black/50"
    case "password_change": return "bg-violet-50 text-violet-600"
    case "profile_update":  return "bg-rivo-green/[0.08] text-rivo-green"
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "الآن"
  if (m < 60) return `منذ ${m} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} ساعة`
  const d = Math.floor(h / 24)
  return `منذ ${d} يوم`
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function NotificationsDropdown({ open, onClose }: Props) {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, dismissNotification } =
    useNotifications()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, onClose])

  if (!open) return null

  const visible = notifications.slice(0, 12)

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-2 w-[340px] bg-white rounded-2xl shadow-xl ring-1 ring-black/[0.07] overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-black/50" strokeWidth={1.8} />
          <span className="text-[13px] font-semibold text-black">الإشعارات</span>
          {unreadCount > 0 && (
            <span className="bg-rivo-green text-rivo-cream text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="flex items-center gap-1 text-[11px] text-rivo-green/80 hover:text-rivo-green font-medium transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" strokeWidth={2} />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-black/[0.04]">
        {visible.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-black/30">
            <Bell className="w-8 h-8 opacity-30" strokeWidth={1.5} />
            <p className="text-[12px]">لا توجد إشعارات</p>
          </div>
        ) : (
          visible.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 hover:bg-black/[0.015] transition-colors cursor-default",
                !n.read && "bg-rivo-green/[0.02]"
              )}
              onClick={() => markNotificationRead(n.id)}
            >
              {/* Unread indicator */}
              <div className="mt-1 flex-shrink-0 relative">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", typeColor(n.type))}>
                  {typeIcon(n.type)}
                </div>
                {!n.read && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rivo-green rounded-full ring-2 ring-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn("text-[12px] font-semibold text-black leading-tight", n.read && "font-medium text-black/70")}>
                  {n.title}
                </p>
                <p className="text-[11px] text-black/50 mt-0.5 leading-snug">{n.message}</p>
                <p className="text-[10px] text-black/30 mt-1">{relativeTime(n.createdAt)}</p>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); dismissNotification(n.id) }}
                className="flex-shrink-0 text-black/20 hover:text-black/50 transition-colors mt-0.5"
                title="إخفاء"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
