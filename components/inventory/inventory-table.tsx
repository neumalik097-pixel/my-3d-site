"use client"

import { useState } from "react"
import {
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react"
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
import { InventoryItem, InventoryStatus } from "@/types/inventory"
import { formatIQD } from "@/lib/currency"

const STATUS_BADGE: Record<InventoryStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  active: "active",
  archived: "archived",
}
const STATUS_LABEL: Record<InventoryStatus, string> = {
  active: "نشط",
  archived: "مؤرشف",
}

export interface InventoryTableProps {
  items: InventoryItem[]
  loading?: boolean
  showLowStockThreshold?: boolean
  onEdit: (item: InventoryItem) => void
  onToggleArchive: (id: string) => void
  onDelete: (id: string) => void
  deleteDescription?: string
}

export function InventoryTable({
  items,
  loading,
  showLowStockThreshold = false,
  onEdit,
  onToggleArchive,
  onDelete,
  deleteDescription,
}: InventoryTableProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const isLowStock = (item: InventoryItem) =>
    showLowStockThreshold &&
    item.lowStockThreshold !== undefined &&
    item.stock <= item.lowStockThreshold

  if (loading) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
        <div className="divide-y divide-black/[0.04]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-10 rounded-full" />
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
        {/* Desktop header */}
        <div className="hidden md:grid gap-4 px-6 py-3 border-b border-black/[0.05] bg-black/[0.015]"
          style={{
            gridTemplateColumns: showLowStockThreshold
              ? "1fr 100px 100px 100px 80px 80px 100px 44px"
              : "1fr 100px 100px 100px 80px 100px 44px",
          }}
        >
          {[
            "الاسم",
            "سعر الشراء",
            "سعر البيع",
            "صافي الربح",
            "المخزون",
            ...(showLowStockThreshold ? ["حد التنبيه"] : []),
            "الحالة",
            "",
          ].map((h) => (
            <p key={h} className="text-[11px] font-bold text-black/35 uppercase tracking-wide">
              {h}
            </p>
          ))}
        </div>

        <div className="divide-y divide-black/[0.04]">
          {items.map((item) => {
            const profit = item.sellPrice - item.buyPrice
            const lowStock = isLowStock(item)

            return (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_auto] md:gap-4 md:px-6 py-4 px-4 items-center hover:bg-black/[0.015] transition-colors"
                style={
                  {
                    gridTemplateColumns: undefined, // mobile: 1fr auto
                  } as React.CSSProperties
                }
              >
                {/* Mobile layout: name + actions */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-rivo-green/[0.08] flex items-center justify-center text-[12px] font-bold text-rivo-green flex-shrink-0 overflow-hidden">
                    {item.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      : item.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-black truncate">{item.name}</p>
                      {lowStock && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-2.5 h-2.5" strokeWidth={2.5} />
                          مخزون منخفض
                        </span>
                      )}
                    </div>
                    {/* mobile: show prices */}
                    <div className="flex items-center gap-3 mt-0.5 md:hidden text-[11px] text-black/45">
                      <span>شراء: {formatIQD(item.buyPrice)}</span>
                      <span>بيع: {formatIQD(item.sellPrice)}</span>
                      <span>مخزون: {item.stock}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop: individual cells rendered inline */}
                <div className="hidden md:contents">
                  <p className="text-[13px] text-black/60 tabular-nums">{formatIQD(item.buyPrice)}</p>
                  <p className="text-[13px] text-black/60 tabular-nums">{formatIQD(item.sellPrice)}</p>
                  <p className={`text-[13px] font-semibold tabular-nums ${profit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {profit >= 0 ? "+" : ""}{formatIQD(profit)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold text-black tabular-nums">{item.stock}</p>
                    {lowStock && (
                      <AlertTriangle className="w-3 h-3 text-orange-500" strokeWidth={2.5} />
                    )}
                  </div>
                  {showLowStockThreshold && (
                    <p className="text-[12px] text-black/40 tabular-nums">
                      {item.lowStockThreshold ?? "—"}
                    </p>
                  )}
                  <Badge variant={STATUS_BADGE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                </div>

                {/* Actions — always visible */}
                <div className="flex items-center justify-end md:justify-start">
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
                      <DropdownMenuItem onSelect={() => onEdit(item)}>
                        <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onToggleArchive(item.id)}>
                        {item.status === "archived" ? (
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
                        onSelect={() => setPendingDeleteId(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                        حذف نهائي
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        description={deleteDescription ?? "سيتم حذف هذا العنصر نهائياً ولن تتمكن من استرجاعه."}
        onConfirm={() => {
          if (pendingDeleteId) onDelete(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />
    </>
  )
}
