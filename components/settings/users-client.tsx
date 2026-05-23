"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, ArchiveX, Archive, Trash2, KeyRound, Eye, EyeOff, UserCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useRivoStore, useUsers, useBarbers } from "@/lib/store"
import { toast } from "@/hooks/use-toast"
import type { User, UserFormData, UserRole } from "@/lib/auth/types"
import { ROLE_LABELS, ROLE_COLORS, USER_STATUS_LABELS } from "@/lib/auth/types"
import { cn } from "@/lib/utils"

// ─── Add User dialog (create only) ────────────────────────────────────────────

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (data: UserFormData) => void
}

function AddUserDialog({ open, onOpenChange, onSubmit }: AddUserDialogProps) {
  const { barbers } = useBarbers()
  const activeBarbers = barbers.filter((b) => b.status !== "archived")

  const [name, setName]         = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole]         = useState<UserRole>("staff")
  const [barberId, setBarberId] = useState("")
  const [showPwd, setShowPwd]   = useState(false)
  const [errors, setErrors]     = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setName(""); setUsername(""); setPassword("")
      setRole("staff"); setBarberId(""); setShowPwd(false); setErrors({})
    }
  }, [open])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2)          e.name     = "الاسم يجب أن يكون حرفين على الأقل"
    if (username.trim().length < 3)      e.username = "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) e.username = "أحرف لاتينية وأرقام وشرطة سفلية فقط"
    if (password.trim().length < 6)      e.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    // Status is always "active" — the store enforces this too.
    const payload: UserFormData = {
      name:     name.trim(),
      username: username.trim(),
      password: password.trim(),
      role,
      status:   "active",
      barberId: role === "staff" && barberId ? barberId : undefined,
    }
    onSubmit(payload)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة مستخدم جديد</DialogTitle>
        </DialogHeader>

        <form id="add-user-form" onSubmit={handleSubmit} className="space-y-4 py-2" noValidate>
          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-black/60">
              الاسم الكامل <span className="text-rose-500">*</span>
            </label>
            <Input
              dir="rtl"
              placeholder="اسم المستخدم"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn("h-9 text-[13px]", errors.name && "border-rose-300")}
            />
            {errors.name && <p className="text-[11px] text-rose-500">{errors.name}</p>}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-black/60">
              اسم المستخدم <span className="text-rose-500">*</span>
            </label>
            <Input
              dir="ltr"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={cn("h-9 text-[13px] text-left", errors.username && "border-rose-300")}
              autoComplete="off"
            />
            {errors.username && <p className="text-[11px] text-rose-500">{errors.username}</p>}
          </div>

          {/* Password — required for new users */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-black/60">
              كلمة المرور <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Input
                dir="ltr"
                type={showPwd ? "text" : "password"}
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn("h-9 text-[13px] text-left pl-10", errors.password && "border-rose-300")}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60 transition-colors"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="w-4 h-4" strokeWidth={1.8} /> : <Eye className="w-4 h-4" strokeWidth={1.8} />}
              </button>
            </div>
            {errors.password && <p className="text-[11px] text-rose-500">{errors.password}</p>}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-black/60">
              الدور <span className="text-rose-500">*</span>
            </label>
            <Select value={role} onValueChange={(v) => { setRole(v as UserRole); setBarberId("") }}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="super_admin">{ROLE_LABELS.super_admin}</SelectItem>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Barber link — only for staff */}
          {role === "staff" && (
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-black/60">ربط بحلاق</label>
              <Select
                value={barberId || "none"}
                onValueChange={(v) => setBarberId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="اختر الحلاق المرتبط (اختياري)" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="none">بدون ربط</SelectItem>
                  {activeBarbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-black/40">
                يربط هذا الحساب بسجل الحلاق لعزل تقاريره وعمولاته
              </p>
            </div>
          )}
        </form>

        <DialogFooter dir="rtl" className="gap-2">
          <Button
            type="submit"
            form="add-user-form"
            className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90"
          >
            إضافة المستخدم
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit User dialog ─────────────────────────────────────────────────────────

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  user: User
  onSubmit: (data: Partial<UserFormData>) => void
}

function EditUserDialog({ open, onOpenChange, user, onSubmit }: EditUserDialogProps) {
  const { barbers } = useBarbers()
  const activeBarbers = barbers.filter((b) => b.status !== "archived")

  const [name, setName]         = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole]         = useState<UserRole>("staff")
  const [barberId, setBarberId] = useState("")
  const [showPwd, setShowPwd]   = useState(false)
  const [errors, setErrors]     = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setName(user.name)
      setUsername(user.username)
      setPassword("")
      setRole(user.role)
      setBarberId(user.barberId ?? "")
      setShowPwd(false)
      setErrors({})
    }
  }, [open, user])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2)          e.name     = "الاسم يجب أن يكون حرفين على الأقل"
    if (username.trim().length < 3)      e.username = "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) e.username = "أحرف لاتينية وأرقام وشرطة سفلية فقط"
    if (password.trim() && password.trim().length < 6) e.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const data: Partial<UserFormData> = {
      name:     name.trim(),
      username: username.trim(),
      role,
      status:   user.status,
      barberId: role === "staff" && barberId ? barberId : undefined,
    }
    // Only include password if the user actually typed one
    if (password.trim()) data.password = password.trim()
    onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
        </DialogHeader>

        <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4 py-2" noValidate>
          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-black/60">
              الاسم الكامل <span className="text-rose-500">*</span>
            </label>
            <Input
              dir="rtl"
              placeholder="اسم المستخدم"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn("h-9 text-[13px]", errors.name && "border-rose-300")}
            />
            {errors.name && <p className="text-[11px] text-rose-500">{errors.name}</p>}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-black/60">
              اسم المستخدم <span className="text-rose-500">*</span>
            </label>
            <Input
              dir="ltr"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={cn("h-9 text-[13px] text-left", errors.username && "border-rose-300")}
              autoComplete="off"
            />
            {errors.username && <p className="text-[11px] text-rose-500">{errors.username}</p>}
          </div>

          {/* Password — optional for edit */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-black/60">
              كلمة المرور <span className="text-black/35 font-normal">(اتركها فارغة لعدم التغيير)</span>
            </label>
            <div className="relative">
              <Input
                dir="ltr"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn("h-9 text-[13px] text-left pl-10", errors.password && "border-rose-300")}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60 transition-colors"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="w-4 h-4" strokeWidth={1.8} /> : <Eye className="w-4 h-4" strokeWidth={1.8} />}
              </button>
            </div>
            {errors.password && <p className="text-[11px] text-rose-500">{errors.password}</p>}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-black/60">
              الدور <span className="text-rose-500">*</span>
            </label>
            <Select value={role} onValueChange={(v) => { setRole(v as UserRole); setBarberId("") }}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="super_admin">{ROLE_LABELS.super_admin}</SelectItem>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Barber link — only for staff */}
          {role === "staff" && (
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-black/60">ربط بحلاق</label>
              <Select
                value={barberId || "none"}
                onValueChange={(v) => setBarberId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="اختر الحلاق المرتبط (اختياري)" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="none">بدون ربط</SelectItem>
                  {activeBarbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form>

        <DialogFooter dir="rtl" className="gap-2">
          <Button
            type="submit"
            form="edit-user-form"
            className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90"
          >
            حفظ التغييرات
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Reset password dialog ────────────────────────────────────────────────────

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  targetName: string
  onConfirm: (newPassword: string) => void
}

function ResetPasswordDialog({ open, onOpenChange, targetName, onConfirm }: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword]         = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [show, setShow]                       = useState(false)
  const [errors, setErrors]                   = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) { setNewPassword(""); setConfirmPassword(""); setErrors({}) }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const e2: Record<string, string> = {}
    if (newPassword.trim().length < 6) e2.newPassword = "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
    if (newPassword !== confirmPassword) e2.confirmPassword = "كلمتا المرور غير متطابقتان"
    setErrors(e2)
    if (Object.keys(e2).length > 0) return
    onConfirm(newPassword.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-black/50">
          تعيين كلمة مرور جديدة للمستخدم: <span className="font-semibold text-black">{targetName}</span>
        </p>
        <form id="reset-pwd-form" onSubmit={handleSubmit} className="space-y-4 py-1" noValidate>
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-black/60">كلمة المرور الجديدة</label>
            <div className="relative">
              <Input
                dir="ltr"
                type={show ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={cn("h-9 text-[13px] text-left pl-10", errors.newPassword && "border-rose-300")}
              />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60" tabIndex={-1}>
                {show ? <EyeOff className="w-4 h-4" strokeWidth={1.8} /> : <Eye className="w-4 h-4" strokeWidth={1.8} />}
              </button>
            </div>
            {errors.newPassword && <p className="text-[11px] text-rose-500">{errors.newPassword}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-black/60">تأكيد كلمة المرور</label>
            <Input
              dir="ltr"
              type={show ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn("h-9 text-[13px] text-left", errors.confirmPassword && "border-rose-300")}
            />
            {errors.confirmPassword && <p className="text-[11px] text-rose-500">{errors.confirmPassword}</p>}
          </div>
        </form>
        <DialogFooter dir="rtl" className="gap-2">
          <Button type="submit" form="reset-pwd-form" className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90">
            تعيين كلمة المرور
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main users client ────────────────────────────────────────────────────────

export function UsersClient() {
  const currentSession = useRivoStore((s) => s.currentSession)
  const { users, loadUsers, addUser, updateUser, archiveUser, deleteUser, resetUserPassword } = useUsers()
  const { barbers } = useBarbers()

  const [addOpen, setAddOpen]         = useState(false)
  const [editTarget, setEditTarget]   = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [deleteId, setDeleteId]       = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const getBarberName = useCallback(
    (barberId?: string) => barbers.find((b) => b.id === barberId)?.name,
    [barbers]
  )

  const handleAdd = async (data: UserFormData) => {
    const result = await addUser(data)
    if (result.success) {
      toast({ title: "تم إضافة المستخدم بنجاح", variant: "success" })
    } else {
      toast({ title: "خطأ", description: result.error, variant: "destructive" })
    }
  }

  const handleEdit = async (data: Partial<UserFormData>) => {
    if (!editTarget) return
    const result = await updateUser(editTarget.id, data)
    if (result.success) {
      toast({ title: "تم حفظ التغييرات", variant: "success" })
    } else {
      toast({ title: "خطأ", description: result.error, variant: "destructive" })
    }
    setEditTarget(null)
  }

  const handleArchive = async (user: User) => {
    if (user.id === currentSession?.userId) {
      toast({ title: "لا يمكن أرشفة حسابك الخاص", variant: "destructive" })
      return
    }
    await archiveUser(user.id)
    toast({
      title: user.status === "active" ? "تم أرشفة المستخدم" : "تم تفعيل المستخدم",
      variant: "success",
    })
  }

  const handleResetPassword = async (newPassword: string) => {
    if (!resetTarget) return
    await resetUserPassword(resetTarget.id, newPassword)
    toast({ title: "تم تغيير كلمة المرور", variant: "success" })
    setResetTarget(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    if (deleteId === currentSession?.userId) {
      toast({ title: "لا يمكن حذف حسابك الخاص", variant: "destructive" })
      setDeleteId(null)
      return
    }
    await deleteUser(deleteId)
    toast({ title: "تم حذف المستخدم", variant: "success" })
    setDeleteId(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-black">إدارة المستخدمين</h3>
          <p className="text-[12px] text-black/40 mt-0.5">{users.length} مستخدم مسجل</p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 h-8 text-[12px] gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          إضافة مستخدم
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
        {/* Desktop header */}
        <div
          className="hidden md:grid px-6 py-3 border-b border-black/[0.05] text-[11px] font-bold text-black/40 uppercase tracking-wide"
          style={{ gridTemplateColumns: "1fr 140px 100px 120px 140px 100px" }}
        >
          <span>المستخدم</span>
          <span>اسم الدخول</span>
          <span>الدور</span>
          <span>الحالة</span>
          <span>الحلاق المرتبط</span>
          <span className="text-left">إجراءات</span>
        </div>

        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-black/30">
            <UserCircle2 className="w-10 h-10 mb-2 opacity-30" strokeWidth={1.5} />
            <p className="text-[13px]">لا يوجد مستخدمون</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            {users.map((user) => {
              const isMe      = user.id === currentSession?.userId
              const barberName = getBarberName(user.barberId)

              return (
                <div key={user.id}>
                  {/* Desktop row */}
                  <div
                    className="hidden md:grid items-center px-6 py-3.5 hover:bg-black/[0.015] transition-colors"
                    style={{ gridTemplateColumns: "1fr 140px 100px 120px 140px 100px" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rivo-green/10 flex items-center justify-center text-rivo-green text-[12px] font-bold flex-shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-black">
                          {user.name}
                          {isMe && (
                            <span className="mr-1.5 text-[10px] font-medium text-rivo-green/70 bg-rivo-green/10 px-1.5 py-0.5 rounded-full">
                              أنت
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <span className="text-[12px] font-mono text-black/60">{user.username}</span>

                    <span className={cn("inline-flex w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full", ROLE_COLORS[user.role])}>
                      {ROLE_LABELS[user.role]}
                    </span>

                    <span className={cn(
                      "inline-flex w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      user.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-black/[0.04] text-black/40"
                    )}>
                      {USER_STATUS_LABELS[user.status]}
                    </span>

                    <span className="text-[12px] text-black/50">
                      {barberName ?? (user.role === "staff" ? <span className="text-black/30">غير مرتبط</span> : "—")}
                    </span>

                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditTarget(user)}
                        className="w-7 h-7 rounded-lg hover:bg-black/[0.06] flex items-center justify-center text-black/40 hover:text-black transition-colors"
                        title="تعديل"
                      >
                        <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                      <button
                        onClick={() => setResetTarget(user)}
                        className="w-7 h-7 rounded-lg hover:bg-black/[0.06] flex items-center justify-center text-black/40 hover:text-amber-600 transition-colors"
                        title="إعادة تعيين كلمة المرور"
                      >
                        <KeyRound className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                      <button
                        onClick={() => handleArchive(user)}
                        disabled={isMe}
                        className="w-7 h-7 rounded-lg hover:bg-black/[0.06] flex items-center justify-center text-black/40 hover:text-rivo-green transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={user.status === "active" ? "أرشفة" : "تفعيل"}
                      >
                        {user.status === "active"
                          ? <ArchiveX className="w-3.5 h-3.5" strokeWidth={1.8} />
                          : <Archive className="w-3.5 h-3.5" strokeWidth={1.8} />
                        }
                      </button>
                      <button
                        onClick={() => setDeleteId(user.id)}
                        disabled={isMe}
                        className="w-7 h-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-black/30 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden px-4 py-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rivo-green/10 flex items-center justify-center text-rivo-green text-[12px] font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-black">{user.name}</p>
                          <p className="text-[11px] font-mono text-black/50">{user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", ROLE_COLORS[user.role])}>
                          {ROLE_LABELS[user.role]}
                        </span>
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          user.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-black/[0.04] text-black/40"
                        )}>
                          {USER_STATUS_LABELS[user.status]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1 border-t border-black/[0.04]">
                      <button
                        onClick={() => setEditTarget(user)}
                        className="flex-1 h-7 rounded-lg bg-black/[0.04] text-[11px] font-medium text-black/60 hover:bg-black/[0.07] transition-colors flex items-center justify-center gap-1"
                      >
                        <Pencil className="w-3 h-3" strokeWidth={2} /> تعديل
                      </button>
                      <button
                        onClick={() => setResetTarget(user)}
                        className="flex-1 h-7 rounded-lg bg-black/[0.04] text-[11px] font-medium text-black/60 hover:bg-amber-50 hover:text-amber-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <KeyRound className="w-3 h-3" strokeWidth={2} /> كلمة المرور
                      </button>
                      <button
                        onClick={() => handleArchive(user)}
                        disabled={isMe}
                        className="h-7 w-7 rounded-lg bg-black/[0.04] flex items-center justify-center text-black/50 hover:bg-rivo-green/10 hover:text-rivo-green transition-colors disabled:opacity-30"
                      >
                        {user.status === "active" ? <ArchiveX className="w-3.5 h-3.5" strokeWidth={1.8} /> : <Archive className="w-3.5 h-3.5" strokeWidth={1.8} />}
                      </button>
                      <button
                        onClick={() => setDeleteId(user.id)}
                        disabled={isMe}
                        className="h-7 w-7 rounded-lg bg-black/[0.04] flex items-center justify-center text-black/40 hover:bg-rose-50 hover:text-rose-500 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add user dialog */}
      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={handleAdd}
      />

      {/* Edit user dialog */}
      {editTarget && (
        <EditUserDialog
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null) }}
          user={editTarget}
          onSubmit={handleEdit}
        />
      )}

      {/* Reset password dialog */}
      <ResetPasswordDialog
        open={!!resetTarget}
        onOpenChange={(v) => { if (!v) setResetTarget(null) }}
        targetName={resetTarget?.name ?? ""}
        onConfirm={handleResetPassword}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا المستخدم بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter dir="rtl" className="gap-2">
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              حذف نهائي
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
