"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Coffee, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { InventoryTable } from "@/components/inventory/inventory-table"
import { InventoryFormDialog } from "@/components/inventory/inventory-form-dialog"
import { useMinibar } from "@/hooks/use-inventory"
import { toast } from "@/hooks/use-toast"
import { InventoryItem, InventoryFormValues } from "@/types/inventory"

type TabValue = "all" | "active" | "archived"

const LABELS = {
  add: "إضافة عنصر للميني بار",
  edit: "تعديل بيانات العنصر",
  namePlaceholder: "اسم العنصر (مشروب، وجبة خفيفة...)",
}

export function MinibarClient() {
  const { items, addItem, updateItem, toggleArchive, deleteItem } = useMinibar()
  const [tab, setTab] = useState<TabValue>("all")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchSearch = !q || item.name.toLowerCase().includes(q)
      const matchTab =
        tab === "all" ||
        (tab === "active" && item.status === "active") ||
        (tab === "archived" && item.status === "archived")
      return matchSearch && matchTab
    })
  }, [items, tab, search])

  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter((i) => i.status === "active").length,
      archived: items.filter((i) => i.status === "archived").length,
    }),
    [items]
  )

  const totalItems = useMemo(
    () => items.filter((i) => i.status === "active").reduce((acc, i) => acc + i.stock, 0),
    [items]
  )

  const openAdd = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (item: InventoryItem) => { setEditing(item); setDialogOpen(true) }

  const handleSubmit = async (data: InventoryFormValues) => {
    if (editing) {
      const result = await updateItem(editing.id, data)
      toast(
        result.success
          ? { title: "تم تحديث العنصر", variant: "success" }
          : { title: "فشل تحديث العنصر", description: result.error, variant: "destructive" }
      )
    } else {
      const result = await addItem(data)
      toast(
        result.success
          ? { title: "تمت إضافة العنصر", variant: "success" }
          : { title: "فشل إضافة العنصر", description: result.error, variant: "destructive" }
      )
    }
  }

  const handleToggleArchive = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id)
    await toggleArchive(id)
    toast({ title: item?.status === "archived" ? "تمت استعادة العنصر" : "تمت أرشفة العنصر" })
  }, [items, toggleArchive])

  const handleDelete = useCallback(async (id: string) => {
    await deleteItem(id)
    toast({ title: "تم حذف العنصر", variant: "destructive" })
  }, [deleteItem])

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-black tracking-tight">إدارة الميني بار</h1>
          <p className="text-[13px] text-black/40 mt-0.5">المشروبات والوجبات الخفيفة</p>
        </div>
        <Button onClick={openAdd} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          إضافة عنصر
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "إجمالي الأصناف", value: counts.all },
          { label: "النشطة", value: counts.active },
          { label: "إجمالي الكميات", value: totalItems },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl ring-1 ring-black/[0.06] px-5 py-4">
            <p className="text-[11px] text-black/40 font-medium mb-1">{s.label}</p>
            <p className="text-[20px] font-bold text-black">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList>
            <TabsTrigger value="all">الكل ({counts.all})</TabsTrigger>
            <TabsTrigger value="active">النشطة ({counts.active})</TabsTrigger>
            <TabsTrigger value="archived">المؤرشفة ({counts.archived})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:mr-auto">
          <Input
            dir="rtl"
            placeholder="بحث بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56 text-[13px]"
          />
        </div>
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06]">
          <EmptyState
            icon={Coffee}
            title="الميني بار فارغ"
            description={
              search
                ? "لا توجد نتائج مطابقة. جرّب كلمة مختلفة."
                : "أضف أول عنصر الآن لبدء إدارة الميني بار."
            }
            action={
              !search ? (
                <Button onClick={openAdd} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2">
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  إضافة عنصر
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <InventoryTable
          items={filtered}
          loading={loading}
          showLowStockThreshold={false}
          onEdit={openEdit}
          onToggleArchive={handleToggleArchive}
          onDelete={handleDelete}
          deleteDescription="سيتم حذف هذا العنصر من الميني بار نهائياً."
        />
      )}

      <InventoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
        labels={LABELS}
        showLowStockThreshold={false}
      />
    </>
  )
}
