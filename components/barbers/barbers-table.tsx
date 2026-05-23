"use client"

import { useState } from "react"
import { Pencil, Archive, ArchiveRestore, Trash2, MoreHorizontal, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"
import { Barber, BarberStatus } from "@/types/barber"

const STATUS_BADGE: Record<BarberStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  active: "active",
  on_break: "on_break",
  archived: "archived",
}
const STATUS_LABEL: Record<BarberStatus, string> = {
  active: "نشط",
  on_break: "في استراحة",
  archived: "مؤرشف",
}

interface BarbersTableProps {
  barbers: Barber[]
  loading?: boolean
  onEdit: (barber: Barber) => void
  onToggleArchive: (id: string) => void
  onDelete: (id: string) => void
}

export function BarbersTable({
  barbers,
  loading,
  onEdit,
  onToggleArchive,
  onDelete,
}: BarbersTableProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
        <div className="divide-y divide-black/[0.04]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1fr_160px_120px_100px_44px] gap-4 px-6 py-3 border-b border-black/[0.05] bg-black/[0.015]">
          {["الحلاق", "الجوال", "العمولة", "الحالة", ""].map((h) => (
            <p key={h} className="text-[11px] font-bold text-black/35 uppercase tracking-wide">
              {h}
            </p>
          ))}
        </div>

        <div className="divide-y divide-black/[0.04]">
          {barbers.map((b) => (
            <div
              key={b.id}
              className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_160px_120px_100px_44px] items-center gap-4 px-6 py-4 hover:bg-black/[0.015] transition-colors"
            >
              {/* Name + initials */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-rivo-green flex items-center justify-center text-rivo-cream text-[12px] font-bold flex-shrink-0">
                  {b.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-black truncate">{b.name}</p>
                  {/* mobile: show phone here */}
                  {b.phone && (
                    <p className="text-[11px] text-black/40 flex items-center gap-1 md:hidden">
                      <Phone className="w-3 h-3" strokeWidth={1.8} />
                      <span dir="ltr">{b.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Phone (desktop) */}
              <div className="hidden md:flex items-center gap-1.5 text-[12px] text-black/50">
                {b.phone ? (
                  <>
                    <Phone className="w-3 h-3 flex-shrink-0" strokeWidth={1.8} />
                    <span dir="ltr">{b.phone}</span>
                  </>
                ) : (
                  <span className="text-black/25">—</span>
                )}
              </div>

              {/* Commission */}
              <div className="hidden md:block">
                <span className="text-[13px] font-semibold text-black tabular-nums">
                  {b.commissionPct}%
                </span>
              </div>

              {/* Status badge */}
              <div className="hidden md:block">
                <Badge variant={STATUS_BADGE[b.status]}>
                  {STATUS_LABEL[b.status]}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-black/40 hover:text-black"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      <span className="sr-only">خيارات</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onEdit(b)}>
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                      تعديل
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onToggleArchive(b.id)}>
                      {b.status === "archived" ? (
                        <>
                          <ArchiveRestore className="w-3.5 h-3.5" strokeWidth={1.8} />
                          استعادة
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5" strokeWidth={1.8} />
                          أرشفة
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      destructive
                      onSelect={() => setPendingDeleteId(b.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                      حذف نهائي
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        description="سيتم حذف بيانات الحلاق نهائياً ولن تتمكن من استرجاعها."
        onConfirm={() => {
          if (pendingDeleteId) onDelete(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />
    </>
  )
}
