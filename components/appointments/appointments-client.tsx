"use client"

import { useState, useMemo, useEffect } from "react"
import { CalendarDays, Plus, Clock, Pencil, Trash2, MoreHorizontal, Search, ChevronDown } from "lucide-react"
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
import { useAppointments, useBarbers, useServices, useClients } from "@/lib/store"
import { toast } from "@/hooks/use-toast"
import {
  appointmentSchema, AppointmentFormValues, Appointment, AppointmentStatus,
  APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUSES,
} from "@/types/appointment"
import { cn } from "@/lib/utils"

type FormErrors = Partial<Record<string, string>>

const STATUS_BADGE: Record<AppointmentStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  pending: "warning",
  confirmed: "active",
  completed: "default",
  cancelled: "destructive",
  no_show: "archived",
}

function AppointmentFormDialog({
  open, onOpenChange, initial, onSubmit,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Appointment | null; onSubmit: (d: AppointmentFormValues) => void }) {
  const { barbers } = useBarbers()
  const { services } = useServices()
  const { clients } = useClients()

  const activeBarbers = useMemo(() => barbers.filter((b) => b.status !== "archived"), [barbers])
  const activeServices = useMemo(() => services.filter((s) => s.status === "active"), [services])

  const EMPTY: AppointmentFormValues = {
    clientName: "", clientId: "", barberId: "",
    serviceIds: [], date: new Date().toISOString().slice(0, 10),
    time: "10:00", status: "pending", notes: "",
  }

  const [values, setValues] = useState<AppointmentFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const isEditing = !!initial

  useEffect(() => {
    if (open) {
      setValues(
        initial
          ? { clientName: initial.clientName, clientId: initial.clientId ?? "", barberId: initial.barberId, serviceIds: initial.serviceIds, date: initial.date, time: initial.time, status: initial.status, notes: initial.notes ?? "" }
          : EMPTY
      )
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof AppointmentFormValues>(k: K, v: AppointmentFormValues[K]) =>
    setValues((p) => ({ ...p, [k]: v }))

  const toggleService = (id: string) => {
    setValues((p) => ({
      ...p,
      serviceIds: p.serviceIds.includes(id) ? p.serviceIds.filter((s) => s !== id) : [...p.serviceIds, id],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = appointmentSchema.safeParse(values)
    if (!result.success) {
      const errs: FormErrors = {}
      for (const issue of result.error.issues) errs[String(issue.path[0])] = issue.message
      setErrors(errs)
      return
    }
    onSubmit(result.data)
    onOpenChange(false)
  }

  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    set("clientId", clientId)
    if (client) set("clientName", client.name)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "تعديل الموعد" : "إضافة موعد جديد"}</DialogTitle>
          <DialogDescription>{isEditing ? "عدّل بيانات الموعد ثم احفظ." : "أدخل بيانات الموعد الجديد."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2 max-h-[60vh] overflow-y-auto" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>العميل</Label>
              <Select value={values.clientId ?? ""} onValueChange={handleClientSelect}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="اختر عميلاً" /></SelectTrigger>
                <SelectContent dir="rtl">
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>أو اسم العميل <span className="text-rose-500">*</span></Label>
              <Input dir="rtl" placeholder="اسم العميل / عابر" value={values.clientName} onChange={(e) => { set("clientName", e.target.value); set("clientId", "") }} className="h-9 text-[13px]" aria-invalid={!!errors.clientName} />
              {errors.clientName && <p className="text-[11px] text-rose-500">{errors.clientName}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>الحلاق <span className="text-rose-500">*</span></Label>
            <Select value={values.barberId} onValueChange={(v) => set("barberId", v)}>
              <SelectTrigger className="h-9 text-[13px]" aria-invalid={!!errors.barberId}><SelectValue placeholder="اختر الحلاق" /></SelectTrigger>
              <SelectContent dir="rtl">
                {activeBarbers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.barberId && <p className="text-[11px] text-rose-500">{errors.barberId}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>الخدمات <span className="text-rose-500">*</span></Label>
            <div className="border border-input rounded-xl p-3 space-y-2 max-h-36 overflow-y-auto">
              {activeServices.map((s) => (
                <label key={s.id} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={values.serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} className="w-3.5 h-3.5 accent-rivo-green" />
                  <span className="text-[13px] text-black/70">{s.name}</span>
                </label>
              ))}
            </div>
            {errors.serviceIds && <p className="text-[11px] text-rose-500">{errors.serviceIds}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>التاريخ <span className="text-rose-500">*</span></Label>
              <Input dir="ltr" type="date" value={values.date} onChange={(e) => set("date", e.target.value)} className="h-9 text-[13px] text-left" />
            </div>
            <div className="space-y-1.5">
              <Label>الوقت <span className="text-rose-500">*</span></Label>
              <Input dir="ltr" type="time" value={values.time} onChange={(e) => set("time", e.target.value)} className="h-9 text-[13px] text-left" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select value={values.status} onValueChange={(v) => set("status", v as AppointmentStatus)}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent dir="rtl">
                {APPOINTMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{APPOINTMENT_STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ملاحظات</Label>
            <textarea dir="rtl" placeholder="ملاحظات اختيارية..." value={values.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className="w-full h-16 bg-white border border-input rounded-xl px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
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

export function AppointmentsClient() {
  const { appointments, addAppointment, updateAppointment, updateStatus, deleteAppointment } = useAppointments()
  const { barbers } = useBarbers()
  const { services } = useServices()
  const [tab, setTab] = useState<AppointmentStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { const t = setTimeout(() => setLoading(false), 300); return () => clearTimeout(t) }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return appointments
      .filter((a) => {
        const matchSearch = !q || a.clientName.toLowerCase().includes(q) ||
          (barbers.find((b) => b.id === a.barberId)?.name ?? "").toLowerCase().includes(q)
        const matchTab = tab === "all" || a.status === tab
        return matchSearch && matchTab
      })
      .sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1)
  }, [appointments, tab, search, barbers])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: appointments.length }
    for (const s of APPOINTMENT_STATUSES) c[s] = appointments.filter((a) => a.status === s).length
    return c
  }, [appointments])

  const openAdd = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (a: Appointment) => { setEditing(a); setDialogOpen(true) }

  const handleSubmit = (data: AppointmentFormValues) => {
    if (editing) {
      updateAppointment(editing.id, data).then((res) => {
        if (res.success) toast({ title: "تم تحديث الموعد" })
        else toast({ title: "خطأ في التحديث", description: res.error, variant: "destructive" })
      })
    } else {
      addAppointment(data).then((res) => {
        if (res.success) toast({ title: "تمت إضافة الموعد", variant: "success" })
        else toast({ title: "خطأ في الإضافة", description: res.error, variant: "destructive" })
      })
    }
  }

  const getBarberName = (id: string) => barbers.find((b) => b.id === id)?.name ?? "—"
  const getServiceNames = (ids: string[]) =>
    ids.map((id) => services.find((s) => s.id === id)?.name ?? id).join("، ")

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-black tracking-tight">إدارة المواعيد</h1>
          <p className="text-[13px] text-black/40 mt-0.5">عرض وإدارة جميع مواعيد الصالون</p>
        </div>
        <Button onClick={openAdd} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          موعد جديد
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "الكل", value: counts.all },
          { label: "معلق", value: counts.pending },
          { label: "مؤكد", value: counts.confirmed },
          { label: "مكتمل", value: counts.completed },
          { label: "ملغي", value: counts.cancelled },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl ring-1 ring-black/[0.06] px-4 py-3">
            <p className="text-[10px] text-black/40 font-medium mb-0.5">{s.label}</p>
            <p className="text-[20px] font-bold text-black">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as AppointmentStatus | "all")}>
          <TabsList>
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="pending">معلق</TabsTrigger>
            <TabsTrigger value="confirmed">مؤكد</TabsTrigger>
            <TabsTrigger value="completed">مكتمل</TabsTrigger>
            <TabsTrigger value="cancelled">ملغي</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:mr-auto">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 pointer-events-none" strokeWidth={1.8} />
          <Input dir="rtl" placeholder="بحث بالعميل أو الحلاق..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-64 text-[13px] pr-9" />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden divide-y divide-black/[0.04]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-48" /></div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06]">
          <EmptyState icon={CalendarDays} title="لا توجد مواعيد" description={search ? "لا توجد نتائج مطابقة." : "أضف أول موعد الآن."} action={!search ? <Button onClick={openAdd} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 gap-2"><Plus className="w-4 h-4" strokeWidth={2.5} />إضافة موعد</Button> : undefined} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
          <div className="hidden lg:grid grid-cols-[1fr_180px_120px_100px_80px_80px_44px] gap-4 px-6 py-3 border-b border-black/[0.05] bg-black/[0.015]">
            {["العميل", "الخدمات", "الحلاق", "التاريخ", "الوقت", "الحالة", ""].map((h) => (
              <p key={h} className="text-[11px] font-bold text-black/35 uppercase tracking-wide">{h}</p>
            ))}
          </div>
          <div className="divide-y divide-black/[0.04]">
            {filtered.map((apt) => (
              <div key={apt.id} className="grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_180px_120px_100px_80px_80px_44px] items-center gap-4 px-6 py-4 hover:bg-black/[0.015] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-rivo-green/[0.08] flex items-center justify-center text-[12px] font-bold text-rivo-green flex-shrink-0">{apt.clientName[0]}</div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-black truncate">{apt.clientName}</p>
                    <p className="text-[11px] text-black/40 truncate lg:hidden">{getBarberName(apt.barberId)} • {apt.date} {apt.time}</p>
                  </div>
                </div>
                <p className="hidden lg:block text-[12px] text-black/55 truncate">{getServiceNames(apt.serviceIds)}</p>
                <p className="hidden lg:block text-[12px] text-black/55">{getBarberName(apt.barberId)}</p>
                <p className="hidden lg:block text-[12px] text-black/55 tabular-nums">{apt.date}</p>
                <div className="hidden lg:flex items-center gap-1 text-[12px] text-black font-medium">
                  <Clock className="w-3 h-3 flex-shrink-0 text-black/30" strokeWidth={1.8} />
                  {apt.time}
                </div>
                <div className="hidden lg:block">
                  <Badge variant={STATUS_BADGE[apt.status]}>{APPOINTMENT_STATUS_LABELS[apt.status]}</Badge>
                </div>
                <div className="flex items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="text-black/40 hover:text-black">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEdit(apt)}><Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />تعديل</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {APPOINTMENT_STATUSES.filter((s) => s !== apt.status).map((s) => (
                        <DropdownMenuItem key={s} onSelect={() => { updateStatus(apt.id, s).then(() => { toast({ title: `تم تغيير الحالة إلى ${APPOINTMENT_STATUS_LABELS[s]}` }) }) }}>
                          <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.8} />
                          {APPOINTMENT_STATUS_LABELS[s]}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setPendingDeleteId(apt.id)}><Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />حذف</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AppointmentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSubmit={handleSubmit} />
      <ConfirmDeleteDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        description="سيتم حذف الموعد نهائياً."
        onConfirm={() => {
          const id = pendingDeleteId
          setPendingDeleteId(null)
          if (id) deleteAppointment(id).then(() => { toast({ title: "تم حذف الموعد", variant: "destructive" }) })
        }}
      />
    </>
  )
}
