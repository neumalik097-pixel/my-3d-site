"use client"

import { useState, useMemo, useEffect } from "react"
import { UserPlus, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { BarbersTable } from "@/components/barbers/barbers-table"
import { BarberFormDialog } from "@/components/barbers/barber-form-dialog"
import { useBarbers } from "@/hooks/use-barbers"
import { Barber, BarberFormValues } from "@/types/barber"

type TabValue = "all" | "active" | "archived"

export function BarbersClient() {
  const { barbers, addBarber, updateBarber, toggleArchive, deleteBarber } = useBarbers()
  const [tab, setTab] = useState<TabValue>("all")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Barber | null>(null)
  const [loading, setLoading] = useState(true)

  // Simulate brief skeleton on mount
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return barbers.filter((b) => {
      const matchSearch = !q || b.name.toLowerCase().includes(q)
      const matchTab =
        tab === "all" ||
        (tab === "active" && b.status !== "archived") ||
        (tab === "archived" && b.status === "archived")
      return matchSearch && matchTab
    })
  }, [barbers, tab, search])

  const counts = useMemo(
    () => ({
      all: barbers.length,
      active: barbers.filter((b) => b.status !== "archived").length,
      archived: barbers.filter((b) => b.status === "archived").length,
    }),
    [barbers]
  )

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (b: Barber) => {
    setEditing(b)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: BarberFormValues) => {
    if (editing) {
      await updateBarber(editing.id, data)
    } else {
      await addBarber(data)
    }
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-black tracking-tight">إدارة الحلاقين</h1>
          <p className="text-[13px] text-black/40 mt-0.5">فريق العمل والعمولات</p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2"
        >
          <UserPlus className="w-4 h-4" strokeWidth={2} />
          إضافة حلاق
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "إجمالي الحلاقين", value: counts.all },
          { label: "النشطون الآن", value: counts.active },
          { label: "المؤرشفون", value: counts.archived },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl ring-1 ring-black/[0.06] px-5 py-4">
            <p className="text-[11px] text-black/40 font-medium mb-1">{s.label}</p>
            <p className="text-[24px] font-bold text-black">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList>
            <TabsTrigger value="all">الكل ({counts.all})</TabsTrigger>
            <TabsTrigger value="active">النشطين ({counts.active})</TabsTrigger>
            <TabsTrigger value="archived">المؤرشفين ({counts.archived})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative sm:mr-auto">
          <Input
            dir="rtl"
            placeholder="بحث بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56 text-[13px] pr-3"
          />
        </div>
      </div>

      {/* Table or empty state */}
      {!loading && filtered.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06]">
          <EmptyState
            icon={Scissors}
            title="لا يوجد حلاقون"
            description={
              search
                ? "لا توجد نتائج مطابقة لبحثك. جرّب كلمة مختلفة."
                : "أضف أول حلاق الآن لبدء إدارة فريق العمل."
            }
            action={
              !search ? (
                <Button
                  onClick={openAdd}
                  className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2"
                >
                  <UserPlus className="w-4 h-4" strokeWidth={2} />
                  إضافة حلاق
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <BarbersTable
          barbers={filtered}
          loading={loading}
          onEdit={openEdit}
          onToggleArchive={toggleArchive}
          onDelete={deleteBarber}
        />
      )}

      <BarberFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </>
  )
}
