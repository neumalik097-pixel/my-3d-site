"use client"

import { useState, useMemo, useEffect } from "react"
import { Scissors, Plus, Clock, Star, Pencil, Archive, ArchiveRestore, Trash2, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { useServices } from "@/lib/store"
import { formatIQD } from "@/lib/currency"
import { toast } from "@/hooks/use-toast"
import {
  serviceSchema, ServiceFormValues, Service, SERVICE_CATEGORIES,
} from "@/types/service"

type TabValue = "all" | "active" | "archived"
type FormErrors = Partial<Record<keyof ServiceFormValues, string>>

const EMPTY: ServiceFormValues = {
  name: "", category: "الحلاقة", price: 0, duration: 30, popular: false, status: "active",
}

function ServiceFormDialog({
  open, onOpenChange, initial, onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Service | null
  onSubmit: (data: ServiceFormValues) => void
}) {
  const [values, setValues] = useState<ServiceFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const isEditing = !!initial

  useEffect(() => {
    if (open) {
      setValues(
        initial
          ? { name: initial.name, category: initial.category, price: initial.price, duration: initial.duration, popular: initial.popular, status: initial.status }
          : EMPTY
      )
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof ServiceFormValues>(k: K, v: ServiceFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = serviceSchema.safeParse(values)
    if (!result.success) {
      const errs: FormErrors = {}
      for (const issue of result.error.issues) {
        errs[issue.path[0] as keyof ServiceFormValues] = issue.message
      }
      setErrors(errs)
      return
    }
    onSubmit(result.data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</DialogTitle>
          <DialogDescription>{isEditing ? "عدّل البيانات ثم احفظ." : "أدخل بيانات الخدمة الجديدة."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2" noValidate>
          <div className="space-y-1.5">
            <Label>الاسم <span className="text-rose-500">*</span></Label>
            <Input dir="rtl" placeholder="اسم الخدمة" value={values.name} onChange={(e) => set("name", e.target.value)} className="h-9 text-[13px]" aria-invalid={!!errors.name} />
            {errors.name && <p className="text-[11px] text-rose-500">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>الفئة</Label>
              <Select value={values.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  {SERVICE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الحالة</Label>
              <Select value={values.status} onValueChange={(v) => set("status", v as ServiceFormValues["status"])}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="active">نشطة</SelectItem>
                  <SelectItem value="archived">مؤرشفة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>السعر (د.ع) <span className="text-rose-500">*</span></Label>
              <Input dir="ltr" type="number" min={0} step={500} placeholder="0" value={values.price} onChange={(e) => set("price", Number(e.target.value))} className="h-9 text-[13px] text-left" aria-invalid={!!errors.price} />
              {errors.price && <p className="text-[11px] text-rose-500">{errors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>المدة (دقيقة)</Label>
              <Input dir="ltr" type="number" min={5} step={5} placeholder="30" value={values.duration} onChange={(e) => set("duration", Number(e.target.value))} className="h-9 text-[13px] text-left" aria-invalid={!!errors.duration} />
              {errors.duration && <p className="text-[11px] text-rose-500">{errors.duration}</p>}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => set("popular", !values.popular)}
              className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${values.popular ? "bg-rivo-green" : "bg-black/10"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${values.popular ? "right-0.5" : "left-0.5"}`} />
            </div>
            <span className="text-[13px] text-black/70 font-medium">الأكثر طلباً</span>
          </label>
        </form>
        <DialogFooter dir="rtl" className="gap-2">
          <Button onClick={handleSubmit as unknown as React.MouseEventHandler} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90">
            {isEditing ? "حفظ التغييرات" : "إضافة"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ServicesClient() {
  const { services, addService, updateService, toggleArchive, deleteService } = useServices()
  const [tab, setTab] = useState<TabValue>("all")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { const t = setTimeout(() => setLoading(false), 300); return () => clearTimeout(t) }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services.filter((s) => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      const matchTab = tab === "all" || (tab === "active" && s.status === "active") || (tab === "archived" && s.status === "archived")
      return matchSearch && matchTab
    })
  }, [services, tab, search])

  const counts = useMemo(() => ({
    all: services.length,
    active: services.filter((s) => s.status === "active").length,
    archived: services.filter((s) => s.status === "archived").length,
  }), [services])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, [])
      map.get(s.category)!.push(s)
    }
    return map
  }, [filtered])

  const openAdd = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (s: Service) => { setEditing(s); setDialogOpen(true) }

  const handleSubmit = async (data: ServiceFormValues) => {
    if (editing) {
      const result = await updateService(editing.id, data)
      toast(
        result.success
          ? { title: "تم تحديث الخدمة", variant: "success" }
          : { title: "فشل تحديث الخدمة", description: result.error, variant: "destructive" }
      )
    } else {
      const result = await addService(data)
      toast(
        result.success
          ? { title: "تمت إضافة الخدمة", variant: "success" }
          : { title: "فشل إضافة الخدمة", description: result.error, variant: "destructive" }
      )
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-black tracking-tight">إدارة الخدمات</h1>
          <p className="text-[13px] text-black/40 mt-0.5">كتالوج الخدمات والأسعار</p>
        </div>
        <Button onClick={openAdd} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          خدمة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "إجمالي الخدمات", value: counts.all },
          { label: "النشطة", value: counts.active },
          { label: "المؤرشفة", value: counts.archived },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl ring-1 ring-black/[0.06] px-5 py-4">
            <p className="text-[11px] text-black/40 font-medium mb-1">{s.label}</p>
            <p className="text-[20px] font-bold text-black">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList>
            <TabsTrigger value="all">الكل ({counts.all})</TabsTrigger>
            <TabsTrigger value="active">النشطة ({counts.active})</TabsTrigger>
            <TabsTrigger value="archived">المؤرشفة ({counts.archived})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input dir="rtl" placeholder="بحث بالاسم أو الفئة..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-56 text-[13px] sm:mr-auto" />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden divide-y divide-black/[0.04]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06]">
          <EmptyState icon={Scissors} title="لا توجد خدمات" description={search ? "لا توجد نتائج مطابقة." : "أضف أول خدمة الآن."} action={!search ? <Button onClick={openAdd} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2"><Plus className="w-4 h-4" strokeWidth={2.5} />إضافة خدمة</Button> : undefined} />
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category} className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
              <div className="px-6 py-3 border-b border-black/[0.05] bg-black/[0.015]">
                <h3 className="text-[12px] font-bold text-black/60 uppercase tracking-wide">{category}</h3>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {items.map((svc) => (
                  <div key={svc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-black/[0.015] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-semibold text-black">{svc.name}</p>
                        {svc.popular && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rivo-green bg-rivo-green/[0.08] px-2 py-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5" fill="currentColor" />
                            الأكثر طلباً
                          </span>
                        )}
                        {svc.status === "archived" && <Badge variant="archived">مؤرشفة</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-black/40">
                        <Clock style={{ width: 11, height: 11 }} strokeWidth={1.8} />
                        {svc.duration} دقيقة
                      </div>
                    </div>
                    <p className="text-[16px] font-bold text-black tabular-nums flex-shrink-0">
                      {formatIQD(svc.price)}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="text-black/40 hover:text-black flex-shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEdit(svc)}>
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={async () => { await toggleArchive(svc.id); toast({ title: svc.status === "archived" ? "تمت استعادة الخدمة" : "تمت أرشفة الخدمة" }) }}>
                          {svc.status === "archived" ? <><ArchiveRestore className="w-3.5 h-3.5" strokeWidth={1.8} />استعادة</> : <><Archive className="w-3.5 h-3.5" strokeWidth={1.8} />أرشفة</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => setPendingDeleteId(svc.id)}>
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />حذف نهائي
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ServiceFormDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSubmit={handleSubmit} />
      <ConfirmDeleteDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        description="سيتم حذف الخدمة نهائياً ولن تتمكن من استرجاعها."
        onConfirm={async () => {
          if (pendingDeleteId) { await deleteService(pendingDeleteId); toast({ title: "تم حذف الخدمة", variant: "destructive" }) }
          setPendingDeleteId(null)
        }}
      />
    </>
  )
}
