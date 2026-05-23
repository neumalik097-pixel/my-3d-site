"use client"

import { useState, useEffect } from "react"
import { User, Bell, Shield, CreditCard, Globe, Scissors, Lock, Eye, EyeOff } from "lucide-react"
import { useRivoStore, useAuth } from "@/lib/store"
import { toast } from "@/hooks/use-toast"
import type { SettingsData } from "@/lib/stores/types"
import { cn } from "@/lib/utils"

export function SettingsClient() {
  const settings = useRivoStore((s) => s.settings)
  const updateSettings = useRivoStore((s) => s.updateSettings)
  const { currentSession, updateCurrentUserProfile, updateCurrentUserCredentials } = useAuth()

  // Read the stored password directly so the "current password" field is accurate
  const storedPassword = useRivoStore((s) =>
    s.users.find((u) => u.id === s.currentSession?.userId)?.password ?? ""
  )

  const [draft, setDraft] = useState<SettingsData>(() => ({
    ...settings,
    managerName: currentSession?.name ?? settings.managerName,
  }))
  const [savingSection, setSavingSection] = useState<"profile" | "branch" | null>(null)

  // Credentials state
  const [credDraft, setCredDraft] = useState({
    username: currentSession?.username ?? "",
    newPassword: "",
    confirmPassword: "",
  })
  const [savingCredentials, setSavingCredentials] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Keep fields in sync with live session
  const sessionName = currentSession?.name ?? ""
  const sessionUsername = currentSession?.username ?? ""
  useEffect(() => {
    setDraft((p) => ({ ...p, managerName: sessionName }))
  }, [sessionName])
  useEffect(() => {
    setCredDraft((p) => ({ ...p, username: sessionUsername }))
  }, [sessionUsername])

  const set = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const handleSave = async (section: "profile" | "branch") => {
    setSavingSection(section)
    try {
      updateSettings(draft)
      if (section === "profile") {
        await updateCurrentUserProfile(draft.managerName)
      }
      toast({ title: "تم الحفظ بنجاح", variant: "success" })
    } catch {
      toast({ title: "خطأ في الحفظ", description: "تعذّر حفظ التغييرات", variant: "destructive" })
    } finally {
      setSavingSection(null)
    }
  }

  const handleSaveCredentials = async () => {
    const username = credDraft.username.trim()
    if (!username) {
      toast({ title: "خطأ", description: "اسم المستخدم لا يمكن أن يكون فارغاً", variant: "destructive" })
      return
    }
    if (credDraft.newPassword && credDraft.newPassword !== credDraft.confirmPassword) {
      toast({ title: "خطأ", description: "كلمة المرور الجديدة غير متطابقة", variant: "destructive" })
      return
    }

    setSavingCredentials(true)
    try {
      const result = await updateCurrentUserCredentials({
        username,
        password: credDraft.newPassword || undefined,
      })
      if (!result.success) {
        toast({ title: "خطأ في الحفظ", description: result.error, variant: "destructive" })
        return
      }
      setCredDraft((p) => ({ ...p, newPassword: "", confirmPassword: "" }))
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      toast({ title: "تم الحفظ بنجاح", variant: "success" })
    } catch {
      toast({ title: "خطأ في الحفظ", description: "تعذّر حفظ التغييرات", variant: "destructive" })
    } finally {
      setSavingCredentials(false)
    }
  }

  const toggles = [
    { label: "إشعارات المواعيد الجديدة", description: "استلم إشعاراً عند حجز موعد جديد", key: "notifAppointments" as const },
    { label: "تذكير بالمواعيد", description: "إشعار قبل ٣٠ دقيقة من كل موعد", key: "notifReminders" as const },
    { label: "تقرير اليومي", description: "ملخص يومي بعد إغلاق الصالون", key: "notifDailyReport" as const },
    { label: "إشعارات التقييمات", description: "إشعار عند وصول تقييم جديد من عميل", key: "notifReviews" as const },
  ]

  const fieldClass =
    "w-full h-9 bg-black/[0.025] border border-black/[0.07] rounded-xl px-3 text-[13px] text-black focus:outline-none focus:border-rivo-green/30 focus:bg-white transition-all"
  const saveBtnClass =
    "bg-rivo-green text-rivo-cream text-[12px] font-semibold px-4 py-2 rounded-xl hover:bg-rivo-green/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
      {/* Main settings */}
      <div className="space-y-4">
        {/* Profile */}
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.05]">
            <div className="w-8 h-8 rounded-xl bg-rivo-green/[0.08] flex items-center justify-center flex-shrink-0">
              <User style={{ width: 15, height: 15 }} className="text-rivo-green" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-black">الملف الشخصي</h3>
              <p className="text-[11px] text-black/40">بيانات الصالون والمدير</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {(
              [
                { label: "اسم الصالون", key: "salonName", type: "text" },
                { label: "اسم المدير", key: "managerName", type: "text" },
                { label: "البريد الإلكتروني", key: "email", type: "email" },
                { label: "رقم الجوال", key: "phone", type: "tel" },
              ] as const
            ).map((field) => (
              <div key={field.key}>
                <label className="block text-[12px] font-semibold text-black/50 mb-1.5">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={draft[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  dir="rtl"
                  className={fieldClass}
                />
              </div>
            ))}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleSave("profile")}
                disabled={savingSection === "profile"}
                className={saveBtnClass}
              >
                {savingSection === "profile" ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </button>
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.05]">
            <div className="w-8 h-8 rounded-xl bg-rivo-green/[0.08] flex items-center justify-center flex-shrink-0">
              <Lock style={{ width: 15, height: 15 }} className="text-rivo-green" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-black">بيانات الدخول</h3>
              <p className="text-[11px] text-black/40">اسم المستخدم وكلمة المرور</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Username */}
            <div>
              <label className="block text-[12px] font-semibold text-black/50 mb-1.5">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={credDraft.username}
                onChange={(e) => setCredDraft((p) => ({ ...p, username: e.target.value }))}
                dir="ltr"
                className={`${fieldClass} text-left`}
                autoComplete="username"
              />
            </div>

            {/* Current Password — read-only display */}
            <div>
              <label className="block text-[12px] font-semibold text-black/50 mb-1.5">
                كلمة المرور الحالية
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={storedPassword}
                  readOnly
                  dir="ltr"
                  className={`${fieldClass} text-left pl-9 bg-black/[0.015] cursor-default select-none`}
                  tabIndex={-1}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60 transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword
                    ? <EyeOff style={{ width: 14, height: 14 }} strokeWidth={1.8} />
                    : <Eye style={{ width: 14, height: 14 }} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[12px] font-semibold text-black/50 mb-1.5">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={credDraft.newPassword}
                  onChange={(e) => setCredDraft((p) => ({ ...p, newPassword: e.target.value }))}
                  dir="ltr"
                  placeholder="••••••••"
                  className={`${fieldClass} text-left pl-9`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60 transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword
                    ? <EyeOff style={{ width: 14, height: 14 }} strokeWidth={1.8} />
                    : <Eye style={{ width: 14, height: 14 }} strokeWidth={1.8} />}
                </button>
              </div>
              <p className="text-[11px] text-black/35 mt-1">اتركها فارغة لعدم تغيير كلمة المرور الحالية</p>
            </div>

            {/* Confirm — only shown when typing a new password */}
            {credDraft.newPassword && (
              <div>
                <label className="block text-[12px] font-semibold text-black/50 mb-1.5">
                  تأكيد كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={credDraft.confirmPassword}
                    onChange={(e) => setCredDraft((p) => ({ ...p, confirmPassword: e.target.value }))}
                    dir="ltr"
                    placeholder="••••••••"
                    className={cn(
                      `${fieldClass} text-left pl-9`,
                      credDraft.confirmPassword && credDraft.confirmPassword !== credDraft.newPassword
                        ? "border-rose-300 focus:border-rose-300"
                        : ""
                    )}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword
                      ? <EyeOff style={{ width: 14, height: 14 }} strokeWidth={1.8} />
                      : <Eye style={{ width: 14, height: 14 }} strokeWidth={1.8} />}
                  </button>
                </div>
                {credDraft.confirmPassword && credDraft.confirmPassword !== credDraft.newPassword && (
                  <p className="text-[11px] text-rose-500 mt-1">كلمتا المرور غير متطابقتان</p>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveCredentials}
                disabled={savingCredentials}
                className={saveBtnClass}
              >
                {savingCredentials ? "جارٍ الحفظ..." : "حفظ بيانات الدخول"}
              </button>
            </div>
          </div>
        </div>

        {/* Branch */}
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.05]">
            <div className="w-8 h-8 rounded-xl bg-rivo-green/[0.08] flex items-center justify-center flex-shrink-0">
              <Globe style={{ width: 15, height: 15 }} className="text-rivo-green" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-black">بيانات الفرع</h3>
              <p className="text-[11px] text-black/40">الموقع وأوقات العمل</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {(
              [
                { label: "العنوان", key: "address", type: "text" },
                { label: "ساعات العمل", key: "workingHours", type: "text" },
              ] as const
            ).map((field) => (
              <div key={field.key}>
                <label className="block text-[12px] font-semibold text-black/50 mb-1.5">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={draft[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  dir="rtl"
                  className={fieldClass}
                />
              </div>
            ))}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleSave("branch")}
                disabled={savingSection === "branch"}
                className={saveBtnClass}
              >
                {savingSection === "branch" ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </button>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl ring-1 ring-rose-100 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-rose-50">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
              <Shield style={{ width: 15, height: 15 }} className="text-rose-500" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-black">منطقة الخطر</h3>
              <p className="text-[11px] text-black/40">إجراءات لا يمكن التراجع عنها</p>
            </div>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-black">إعادة تعيين بيانات النظام</p>
              <p className="text-[11px] text-black/40 mt-0.5">سيتم حذف جميع البيانات بشكل نهائي</p>
            </div>
            <button className="bg-rose-50 text-rose-600 text-[12px] font-semibold px-4 py-2 rounded-xl hover:bg-rose-100 transition-colors border border-rose-100">
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-4">
        {/* Notifications */}
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.05]">
            <div className="w-8 h-8 rounded-xl bg-rivo-green/[0.08] flex items-center justify-center flex-shrink-0">
              <Bell style={{ width: 15, height: 15 }} className="text-rivo-green" strokeWidth={1.8} />
            </div>
            <h3 className="text-[14px] font-semibold text-black">الإشعارات</h3>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {toggles.map((t) => (
              <div key={t.key} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-black">{t.label}</p>
                  <p className="text-[11px] text-black/40 mt-0.5 leading-tight">{t.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !draft[t.key]
                    set(t.key, next)
                    updateSettings({ [t.key]: next })
                  }}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${draft[t.key] ? "bg-rivo-green" : "bg-black/10"}`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${draft[t.key] ? "right-0.5" : "left-0.5"}`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Plan */}
        <div className="bg-rivo-green rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scissors style={{ width: 16, height: 16 }} className="text-rivo-cream" strokeWidth={2} />
            <p className="text-[13px] font-bold text-rivo-cream">خطة الاحتراف</p>
          </div>
          <p className="text-[11px] text-rivo-cream/60 mb-4">
            أنت على خطة الاحتراف. تجديد في ١ يونيو ٢٠٢٦
          </p>
          <div className="flex items-center gap-2">
            <CreditCard style={{ width: 13, height: 13 }} className="text-rivo-cream/60" strokeWidth={1.8} />
            <span className="text-[12px] text-rivo-cream/60">•••• •••• •••• ٤٢٤٢</span>
          </div>
        </div>
      </div>
    </div>
  )
}
