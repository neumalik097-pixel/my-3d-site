"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  Star,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronUp,
  Package,
  Coffee,
  ShoppingCart,
  UserCircle,
  UserCog,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useRivoStore } from "@/lib/store"
import { canAccessRoute } from "@/lib/auth/permissions"
import { ROLE_LABELS } from "@/lib/auth/types"
import { UsersClient } from "@/components/settings/users-client"

// Full nav definition — filtered per role at render time
const ALL_NAV_GROUPS = [
  {
    label: "القائمة الرئيسية",
    items: [
      { icon: LayoutDashboard, label: "لوحة التحكم", href: "/" },
      { icon: ShoppingCart, label: "نقطة البيع", href: "/pos" },
      { icon: CalendarDays, label: "المواعيد", href: "/appointments" },
      { icon: Users, label: "العملاء", href: "/clients" },
      { icon: Scissors, label: "الحلاقون", href: "/barbers" },
      { icon: Star, label: "الخدمات", href: "/services" },
    ],
  },
  {
    label: "المخزون",
    items: [
      { icon: Package, label: "المنتجات", href: "/products" },
      { icon: Coffee, label: "الميني بار", href: "/minibar" },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { icon: BarChart3, label: "التقارير", href: "/reports" },
      { icon: Settings, label: "الإعدادات", href: "/settings" },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const currentSession = useRivoStore((s) => s.currentSession)
  const logout = useRivoStore((s) => s.logout)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [usersDialogOpen, setUsersDialogOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [dropdownOpen])

  // Filter nav items to only those accessible by the current role
  const visibleGroups = useMemo(() => {
    if (!currentSession) return []
    return ALL_NAV_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          canAccessRoute(currentSession.role, item.href)
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [currentSession])

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    router.replace("/login")
  }

  const isSuper = currentSession?.role === "super_admin"
  const displayName = currentSession?.name ?? "—"
  const displayRole = currentSession ? ROLE_LABELS[currentSession.role] : ""
  const initial = displayName.charAt(0)

  const menuItemClass =
    "w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-rivo-cream/70 hover:bg-white/[0.07] hover:text-rivo-cream transition-colors text-right"

  return (
    <aside className="relative flex flex-col w-[260px] min-h-screen bg-rivo-green border-l border-white/[0.07] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-[22px] border-b border-white/[0.07]">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          <Scissors className="w-4 h-4 text-rivo-cream" strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <p className="text-rivo-cream font-bold text-[18px] tracking-[0.2em]">RIVO</p>
          <p className="text-rivo-cream/40 text-[10px] font-medium tracking-widest uppercase">
            إدارة الحلاقة
          </p>
        </div>
      </div>

      {/* Navigation groups */}
      <div className="flex-1 px-3 pt-4 pb-2 overflow-y-auto space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.14em] text-rivo-cream/25 uppercase">
              {group.label}
            </p>
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "text-rivo-cream"
                        : "text-rivo-cream/50 hover:bg-white/[0.06] hover:text-rivo-cream/80"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-xl bg-white/[0.13]"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.38 }}
                      />
                    )}
                    <item.icon
                      className={cn(
                        "relative flex-shrink-0",
                        isActive ? "text-rivo-cream" : "text-rivo-cream/45"
                      )}
                      style={{ width: 17, height: 17 }}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <span className="relative flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronLeft
                        className="relative text-rivo-cream/40"
                        style={{ width: 13, height: 13 }}
                        strokeWidth={2.5}
                      />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/[0.07]" />

      {/* User profile section with dropdown */}
      <div className="px-3 py-4 relative" ref={dropdownRef}>
        {/* Profile dropdown menu — anchored above the button */}
        {dropdownOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-[#1a3828] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.08] z-50">
            <Link
              href="/settings"
              onClick={() => setDropdownOpen(false)}
              className={menuItemClass}
            >
              <UserCircle style={{ width: 15, height: 15, flexShrink: 0 }} strokeWidth={1.8} />
              الحساب الشخصي
            </Link>
            <Link
              href="/settings"
              onClick={() => setDropdownOpen(false)}
              className={menuItemClass}
            >
              <Settings style={{ width: 15, height: 15, flexShrink: 0 }} strokeWidth={1.8} />
              تعديل الملف الشخصي
            </Link>
            {isSuper && (
              <button
                onClick={() => { setDropdownOpen(false); setUsersDialogOpen(true) }}
                className={menuItemClass}
              >
                <UserCog style={{ width: 15, height: 15, flexShrink: 0 }} strokeWidth={1.8} />
                إدارة المستخدمين
              </button>
            )}
            <div className="mx-3 border-t border-white/[0.07]" />
            <button
              onClick={handleLogout}
              className={cn(menuItemClass, "text-rose-400/80 hover:text-rose-400")}
            >
              <LogOut style={{ width: 15, height: 15, flexShrink: 0 }} strokeWidth={1.8} />
              تسجيل الخروج
            </button>
          </div>
        )}

        {/* Profile trigger button */}
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
          aria-expanded={dropdownOpen}
          aria-haspopup="menu"
        >
          <div className="w-8 h-8 rounded-full bg-rivo-cream/15 flex items-center justify-center flex-shrink-0 text-rivo-cream text-[12px] font-bold">
            {initial}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-rivo-cream/90 text-[13px] font-semibold truncate">
              {displayName}
            </p>
            <p className="text-rivo-cream/38 text-[11px] truncate">{displayRole}</p>
          </div>
          <ChevronUp
            className={cn(
              "text-rivo-cream/30 transition-transform duration-200 flex-shrink-0",
              dropdownOpen ? "rotate-0" : "rotate-180"
            )}
            style={{ width: 14, height: 14 }}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Users management dialog (super_admin only) */}
      {isSuper && (
        <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-[16px] font-bold">إدارة المستخدمين</DialogTitle>
            </DialogHeader>
            <UsersClient />
          </DialogContent>
        </Dialog>
      )}
    </aside>
  )
}
