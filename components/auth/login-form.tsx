"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { Scissors, Eye, EyeOff } from "lucide-react"
import { useRivoStore } from "@/lib/store"
import { getDefaultRoute } from "@/lib/auth/permissions"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const loginSchema = z.object({
  username: z.string().min(1, "يرجى إدخال اسم المستخدم"),
  password: z.string().min(1, "يرجى إدخال كلمة المرور"),
})

type LoginFields = z.infer<typeof loginSchema>
type LoginErrors = Partial<Record<keyof LoginFields, string>>

export function LoginForm() {
  const router = useRouter()
  const hydrated = useRivoStore((s) => s._hydrated)
  const currentSession = useRivoStore((s) => s.currentSession)
  const login = useRivoStore((s) => s.login)

  const [values, setValues] = useState<LoginFields>({ username: "", password: "" })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // If already authenticated, redirect to the role's default landing route
  useEffect(() => {
    if (hydrated && currentSession) {
      router.replace(getDefaultRoute(currentSession.role))
    }
  }, [hydrated, currentSession, router])

  const set = (key: keyof LoginFields, value: string) =>
    setValues((v) => ({ ...v, [key]: value }))

  const validate = (): boolean => {
    const result = loginSchema.safeParse(values)
    if (!result.success) {
      const errs: LoginErrors = {}
      for (const issue of result.error.issues) {
        errs[issue.path[0] as keyof LoginFields] = issue.message
      }
      setErrors(errs)
      return false
    }
    setErrors({})
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading || !validate()) return

    setIsLoading(true)
    const result = await login(values.username.trim(), values.password)
    setIsLoading(false)

    if (result.success) {
      toast({ title: "مرحباً بك!", description: "تم تسجيل الدخول بنجاح", variant: "success" })
      // useEffect above will redirect when currentSession updates
    } else {
      toast({
        title: "فشل تسجيل الدخول",
        description: result.error ?? "اسم المستخدم أو كلمة المرور غير صحيحة",
        variant: "destructive",
      })
    }
  }

  // Loading state while the Zustand store re-hydrates from localStorage
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-rivo-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rivo-green/10 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-rivo-green animate-pulse" strokeWidth={2} />
          </div>
        </div>
      </div>
    )
  }

  // Already authenticated — redirect in progress, render nothing to avoid flash
  if (currentSession) return null

  return (
    <div className="min-h-screen bg-rivo-cream flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-[380px]">

        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-rivo-green flex items-center justify-center mx-auto mb-4 shadow-xl shadow-rivo-green/25">
            <Scissors className="w-7 h-7 text-rivo-cream" strokeWidth={2.2} />
          </div>
          <h1 className="text-[30px] font-bold text-black tracking-[0.18em]">RIVO</h1>
          <p className="text-[13px] text-black/45 mt-1 font-medium tracking-wide">
            نظام إدارة الحلاقة الفاخر
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] p-7 shadow-sm">
          <div className="mb-6">
            <h2 className="text-[18px] font-bold text-black">تسجيل الدخول</h2>
            <p className="text-[12px] text-black/40 mt-0.5">
              أدخل بياناتك للوصول إلى لوحة التحكم
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-black/60">
                اسم المستخدم
              </label>
              <Input
                dir="ltr"
                placeholder="username"
                value={values.username}
                onChange={(e) => set("username", e.target.value)}
                className={cn(
                  "h-10 text-[13px] text-left",
                  errors.username && "border-rose-300 focus-visible:ring-rose-200"
                )}
                disabled={isLoading}
                autoComplete="username"
                autoFocus
              />
              {errors.username && (
                <p className="text-[11px] text-rose-500">{errors.username}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-black/60">
                كلمة المرور
              </label>
              <div className="relative">
                <Input
                  dir="ltr"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={values.password}
                  onChange={(e) => set("password", e.target.value)}
                  className={cn(
                    "h-10 text-[13px] text-left pl-10",
                    errors.password && "border-rose-300 focus-visible:ring-rose-200"
                  )}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                    : <Eye className="w-4 h-4" strokeWidth={1.8} />
                  }
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-500">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-rivo-green text-rivo-cream hover:bg-rivo-green/90 text-[13px] font-bold mt-2 transition-all"
            >
              {isLoading ? "جاري التحقق..." : "تسجيل الدخول"}
            </Button>
          </form>
        </div>

      </div>
    </div>
  )
}
