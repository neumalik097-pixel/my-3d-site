"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Package, Plus } from "lucide-react"
import { formatIQD } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { InventoryTable } from "@/components/inventory/inventory-table"
import { InventoryFormDialog } from "@/components/inventory/inventory-form-dialog"
import { useProducts } from "@/hooks/use-inventory"
import { toast } from "@/hooks/use-toast"
import { InventoryItem, InventoryFormValues } from "@/types/inventory"

type TabValue = "all" | "active" | "archived"

const LABELS = {
  add: "إضافة منتج جديد",
  edit: "تعديل بيانات المنتج",
  namePlaceholder: "اسم المنتج",
}

export function ProductsClient() {
  const { items, addItem, updateItem, toggleArchive, deleteItem } = useProducts()
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

  const totalStockValue = useMemo(
    () => items.filter((i) => i.status === "active").reduce((acc, i) => acc + i.sellPrice * i.stock, 0),
    [items]
  )

  const openAdd = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (item: InventoryItem) => { setEditing(item); setDialogOpen(true) }

  const handleSubmit = async (data: InventoryFormValues) => {
    if (editing) {
      const result = await updateItem(editing.id, data)
      toast(
        result.success
          ? { title: "تم تحديث المنتج", variant: "success" }
          : { title: "فشل تحديث المنتج", description: result.error, variant: "destructive" }
      )
    } else {
      const result = await addItem(data)
      toast(
        result.success
          ? { title: "تمت إضافة المنتج", variant: "success" }
          : { title: "فشل إضافة المنتج", description: result.error, variant: "destructive" }
      )
    }
  }

  const handleToggleArchive = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id)
    await toggleArchive(id)
    toast({ title: item?.status === "archived" ? "تمت استعادة المنتج" : "تمت أرشفة المنتج" })
  }, [items, toggleArchive])

  const handleDelete = useCallback(async (id: string) => {
    await deleteItem(id)
    toast({ title: "تم حذف المنتج", variant: "destructive" })
  }, [deleteItem])

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-black tracking-tight">إدارة المنتجات</h1>
          <p className="text-[13px] text-black/40 mt-0.5">المنتجات والأسعار والمخزون</p>
        </div>
        <Button onClick={openAdd} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          إضافة منتج
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المنتجات", value: counts.all },
          { label: "النشطة", value: counts.active },
          { label: "المؤرشفة", value: counts.archived },
          { label: "قيمة المخزون", value: formatIQD(totalStockValue) },
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
            icon={Package}
            title="لا توجد منتجات"
            description={
              search
                ? "لا توجد نتائج مطابقة. جرّب كلمة مختلفة."
                : "أضف أول منتج الآن لبدء إدارة مخزون الصالون."
            }
            action={
              !search ? (
                <Button onClick={openAdd} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2">
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  إضافة منتج
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <InventoryTable
          items={filtered}
          loading={loading}
          showLowStockThreshold
          onEdit={openEdit}
          onToggleArchive={handleToggleArchive}
          onDelete={handleDelete}
          deleteDescription="سيتم حذف بيانات المنتج نهائياً ولن تتمكن من استرجاعها."
        />
      )}

      <InventoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
        labels={LABELS}
        showLowStockThreshold
      />
    </>
  )
}
