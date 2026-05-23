"use client"

import { useState, useMemo, useEffect } from "react"
import { Users, Plus, Phone, CalendarDays, Pencil, Trash2, MoreHorizontal, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useClients } from "@/lib/store"
import { formatIQD } from "@/lib/currency"
import { toast } from "@/hooks/use-toast"
import { clientSchema, ClientFormValues, Client, ClientTier, TIER_LABELS } from "@/types/client"

type FormErrors = Partial<Record<keyof ClientFormValues, string>>

const EMPTY: ClientFormValues = { name: "", phone: "", email: "", tier: "new", notes: "" }

const TIER_BADGE: Record<ClientTier, React.ComponentProps<typeof Badge>["variant"]> = {
  platinum: "default",
  gold: "on_break",
  silver: "archived",
  new: "active",
}

function ClientFormDialog({
  open, onOpenChange, initial, onSubmit,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Client | null; onSubmit: (d: ClientFormValues) => void }) {
  const [values, setValues] = useState<ClientFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const isEditing = !!initial

  useEffect(() => {
    if (open) {
      setValues(initial ? { name: initial.name, phone: initial.phone ?? "", email: initial.email ?? "", tier: initial.tier, notes: initial.notes ?? "" } : EMPTY)
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof ClientFormValues>(k: K, v: ClientFormValues[K]) => setValues((p) => ({ ...p, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = clientSchema.safeParse(values)
    if (!result.success) {
      const errs: FormErrors = {}
      for (const issue of result.error.issues) errs[issue.path[0] as keyof ClientFormValues] = issue.message
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
          <DialogTitle>{isEditing ? "تعديل بيانات العميل" : "إضافة عميل جديد"}</DialogTitle>
          <DialogDescription>{isEditing ? "عدّل البيانات ثم احفظ." : "أدخل بيانات العميل الجديد."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2" noValidate>
          <div className="space-y-1.5">
            <Label>الاسم <span className="text-rose-500">*</span></Label>
            <Input dir="rtl" placeholder="اسم العميل الكامل" value={values.name} onChange={(e) => set("name", e.target.value)} className="h-9 text-[13px]" aria-invalid={!!errors.name} />
            {errors.name && <p className="text-[11px] text-rose-500">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>رقم الجوال</Label>
              <Input dir="ltr" type="tel" placeholder="05xxxxxxxx" value={values.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className="h-9 text-[13px] text-left" />
            </div>
            <div className="space-y-1.5">
              <Label>الفئة</Label>
              <Select value={values.tier} onValueChange={(v) => set("tier", v as ClientTier)}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  {(Object.entries(TIER_LABELS) as [ClientTier, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>البريد الإلكتروني</Label>
            <Input dir="ltr" type="email" placeholder="example@email.com" value={values.email ?? ""} onChange={(e) => set("email", e.target.value)} className="h-9 text-[13px] text-left" aria-invalid={!!errors.email} />
            {errors.email && <p className="text-[11px] text-rose-500">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>ملاحظات</Label>
            <textarea dir="rtl" placeholder="ملاحظات اختيارية..." value={values.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className="w-full h-20 bg-white border border-input rounded-xl px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </form>
        <DialogFooter dir="rtl" className="gap-2">
          <Button onClick={handleSubmit as unknown as React.MouseEventHandler} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90">{isEditing ? "حفظ التغييرات" : "إضافة"}</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ClientsClient() {
  const { clients, addClient, updateClient, deleteClient } = useClients()
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState<ClientTier | "all">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { const t = setTimeout(() => setLoading(false), 300); return () => clearTimeout(t) }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients.filter((c) => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q)
      const matchTier = tierFilter === "all" || c.tier === tierFilter
      return matchSearch && matchTier
    })
  }, [clients, search, tierFilter])

  const counts = useMemo(() => ({
    total: clients.length,
    platinum: clients.filter((c) => c.tier === "platinum").length,
    gold: clients.filter((c) => c.tier === "gold").length,
    new: clients.filter((c) => c.tier === "new").length,
  }), [clients])

  const openAdd = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (c: Client) => { setEditing(c); setDialogOpen(true) }

  const handleSubmit = (data: ClientFormValues) => {
    if (editing) {
      updateClient(editing.id, data).then((res) => {
        if (res.success) toast({ title: "تم تحديث بيانات العميل" })
        else toast({ title: "خطأ في التحديث", description: res.error, variant: "destructive" })
      })
    } else {
      addClient(data).then((res) => {
        if (res.success) toast({ title: "تمت إضافة العميل", variant: "success" })
        else toast({ title: "خطأ في الإضافة", description: res.error, variant: "destructive" })
      })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-black tracking-tight">إدارة العملاء</h1>
          <p className="text-[13px] text-black/40 mt-0.5">قاعدة بيانات العملاء وسجل الزيارات</p>
        </div>
        <Button onClick={openAdd} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          عميل جديد
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "إجمالي العملاء", value: counts.total },
          { label: "بلاتيني", value: counts.platinum },
          { label: "ذهبي", value: counts.gold },
          { label: "عملاء جدد", value: counts.new },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl ring-1 ring-black/[0.06] px-5 py-4">
            <p className="text-[11px] text-black/40 font-medium mb-1">{s.label}</p>
            <p className="text-[22px] font-bold text-black">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={tierFilter} onValueChange={(v) => setTierFilter(v as ClientTier | "all")}>
          <TabsList>
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="platinum">بلاتيني</TabsTrigger>
            <TabsTrigger value="gold">ذهبي</TabsTrigger>
            <TabsTrigger value="silver">فضي</TabsTrigger>
            <TabsTrigger value="new">جديد</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:mr-auto">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 pointer-events-none" strokeWidth={1.8} />
          <Input dir="rtl" placeholder="بحث بالاسم أو الجوال..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-64 text-[13px] pr-9" />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden divide-y divide-black/[0.04]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-36" /><Skeleton className="h-3 w-24" /></div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06]">
          <EmptyState icon={Users} title="لا يوجد عملاء" description={search ? "لا توجد نتائج مطابقة." : "أضف أول عميل الآن."} action={!search ? <Button onClick={openAdd} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2"><Plus className="w-4 h-4" strokeWidth={2.5} />إضافة عميل</Button> : undefined} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_140px_80px_150px_140px_100px_44px] gap-4 px-6 py-3 border-b border-black/[0.05] bg-black/[0.015]">
            {["العميل", "الجوال", "الزيارات", "آخر زيارة", "إجمالي الإنفاق", "الفئة", ""].map((h) => (
              <p key={h} className="text-[11px] font-bold text-black/35 uppercase tracking-wide">{h}</p>
            ))}
          </div>
          <div className="divide-y divide-black/[0.04]">
            {filtered.map((c) => (
              <div key={c.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_140px_80px_150px_140px_100px_44px] items-center gap-4 px-6 py-4 hover:bg-black/[0.015] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-rivo-green/[0.08] flex items-center justify-center text-[12px] font-bold text-rivo-green flex-shrink-0">{c.name[0]}</div>
                  <span className="text-[13px] font-semibold text-black truncate">{c.name}</span>
                </div>
                <div className="hidden md:flex items-center gap-1.5 text-[12px] text-black/50">
                  {c.phone ? <><Phone className="w-3 h-3 flex-shrink-0" strokeWidth={1.8} /><span dir="ltr">{c.phone}</span></> : <span className="text-black/25">—</span>}
                </div>
                <p className="hidden md:block text-[13px] font-semibold text-black tabular-nums">{c.visitsCount}</p>
                <div className="hidden md:flex items-center gap-1.5 text-[12px] text-black/50">
                  {c.lastVisit ? <><CalendarDays className="w-3 h-3 flex-shrink-0" strokeWidth={1.8} /><span>{new Date(c.lastVisit).toLocaleDateString("ar-IQ")}</span></> : <span className="text-black/25">—</span>}
                </div>
                <p className="hidden md:block text-[13px] font-bold text-black tabular-nums">{formatIQD(c.totalSpent)}</p>
                <div className="hidden md:block">
                  <Badge variant={TIER_BADGE[c.tier]}>{TIER_LABELS[c.tier]}</Badge>
                </div>
                <div className="flex items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="text-black/40 hover:text-black">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />تعديل</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setPendingDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />حذف</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSubmit={handleSubmit} />
      <ConfirmDeleteDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        description="سيتم حذف بيانات العميل نهائياً."
        onConfirm={() => {
          const id = pendingDeleteId
          setPendingDeleteId(null)
          if (id) deleteClient(id).then(() => { toast({ title: "تم حذف العميل", variant: "destructive" }) })
        }}
      />
    </>
  )
}
