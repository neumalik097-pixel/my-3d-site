"use client"

import { ShieldX } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRivoStore } from "@/lib/store"
import { getDefaultRoute } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"

export function AccessDenied() {
  const router = useRouter()
  const currentSession = useRivoStore((s) => s.currentSession)

  const handleReturn = () => {
    router.push(currentSession ? getDefaultRoute(currentSession.role) : "/login")
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[400px] px-4">
      <div className="text-center space-y-4 max-w-xs">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto ring-1 ring-rose-100">
          <ShieldX className="w-7 h-7 text-rose-400" strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[18px] font-bold text-black">غير مصرح بالوصول</h3>
          <p className="text-[13px] text-black/45 mt-1.5 leading-relaxed">
            ليس لديك الصلاحية اللازمة للوصول إلى هذه الصفحة
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReturn}
          className="mt-2"
        >
          العودة للصفحة الرئيسية
        </Button>
      </div>
    </div>
  )
}
