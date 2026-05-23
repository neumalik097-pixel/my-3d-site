"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, XCircle, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-6 left-6 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-[380px] rounded-2xl px-4 py-3.5 shadow-xl shadow-black/20",
              t.variant === "destructive"
                ? "bg-rose-600 text-white"
                : "bg-rivo-green text-rivo-cream"
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {t.variant === "destructive" ? (
                <XCircle className="w-4 h-4" strokeWidth={2} />
              ) : (
                <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-snug">{t.title}</p>
              {t.description && (
                <p className="text-[12px] opacity-75 mt-0.5 leading-snug">{t.description}</p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
