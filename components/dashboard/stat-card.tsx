"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string
  suffix?: string
  change: string
  trend: "up" | "down"
  icon: LucideIcon
  index?: number
}

export default function StatCard({
  title,
  value,
  suffix,
  change,
  trend,
  icon: Icon,
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.1 + index * 0.08,
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{ y: -3, transition: { duration: 0.18, ease: "easeOut" } }}
      className="bg-white rounded-2xl p-5 ring-1 ring-black/[0.06] hover:ring-black/[0.1] hover:shadow-lg hover:shadow-black/[0.04] transition-shadow cursor-default"
    >
      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 rounded-xl bg-rivo-green/[0.07] flex items-center justify-center flex-shrink-0">
          <Icon className="w-[18px] h-[18px] text-rivo-green" strokeWidth={1.8} />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
            trend === "up"
              ? "text-emerald-700 bg-emerald-50"
              : "text-rose-600 bg-rose-50"
          )}
        >
          {trend === "up" ? (
            <TrendingUp className="w-3 h-3" strokeWidth={2} />
          ) : (
            <TrendingDown className="w-3 h-3" strokeWidth={2} />
          )}
          {change}
        </span>
      </div>

      <p className="text-[12px] text-black/45 font-medium mb-1.5 tracking-wide">
        {title}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[26px] font-bold text-black leading-none tracking-tight">
          {value}
        </span>
        {suffix && (
          <span className="text-[13px] font-medium text-black/40">{suffix}</span>
        )}
      </div>
    </motion.div>
  )
}
