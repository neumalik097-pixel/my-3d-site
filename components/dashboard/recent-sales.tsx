"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { ArrowUpLeft } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTransactions } from "@/lib/store"
import { formatIQD } from "@/lib/currency"

export default function RecentSales() {
  const { transactions } = useTransactions()

  const recentSales = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [transactions]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white rounded-2xl ring-1 ring-black/[0.06] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.05]">
        <div>
          <h3 className="text-[15px] font-semibold text-black">آخر المعاملات</h3>
          <p className="text-[12px] text-black/40 mt-0.5">{recentSales.length} معاملة</p>
        </div>
        <button className="flex items-center gap-1.5 text-[12px] font-semibold text-rivo-green hover:text-rivo-green/80 transition-colors">
          عرض الكل
          <ArrowUpLeft className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>

      {recentSales.length === 0 ? (
        <div className="py-16 text-center text-[13px] text-black/30">
          لا توجد معاملات بعد
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-b border-black/[0.05] hover:bg-transparent">
              <TableHead className="text-right text-[11px] font-semibold text-black/35 uppercase tracking-wide px-6 py-3 h-auto">
                العميل
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold text-black/35 uppercase tracking-wide px-4 py-3 h-auto hidden md:table-cell">
                الفاتورة
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold text-black/35 uppercase tracking-wide px-4 py-3 h-auto hidden lg:table-cell">
                الحلاق
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold text-black/35 uppercase tracking-wide px-4 py-3 h-auto hidden sm:table-cell">
                الوقت
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold text-black/35 uppercase tracking-wide px-4 py-3 h-auto">
                المبلغ
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold text-black/35 uppercase tracking-wide px-6 py-3 h-auto">
                الحالة
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentSales.map((tx) => {
              const isReturned = tx.status === "returned"
              const timeStr = new Date(tx.createdAt).toLocaleTimeString("ar-IQ", {
                hour: "2-digit",
                minute: "2-digit",
              })
              return (
                <TableRow
                  key={tx.id}
                  className="border-b border-black/[0.04] hover:bg-black/[0.015] transition-colors last:border-0"
                >
                  <TableCell className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rivo-green/[0.09] flex items-center justify-center text-[12px] font-bold text-rivo-green flex-shrink-0">
                        {tx.clientName.charAt(0)}
                      </div>
                      <span className="text-[13px] font-semibold text-black whitespace-nowrap">
                        {tx.clientName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-[12px] text-rivo-green font-bold tabular-nums hidden md:table-cell">
                    {tx.id}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-[13px] text-black/55 hidden lg:table-cell">
                    {tx.barberName || "مبيعة عامة"}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-[12px] text-black/40 tabular-nums hidden sm:table-cell">
                    {timeStr}
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <span className={`text-[13px] font-bold tabular-nums ${isReturned ? "line-through text-black/40" : "text-black"}`}>
                      {formatIQD(tx.total)}
                    </span>
                    {tx.paymentMethod === "card" && (
                      <span className="text-[10px] text-black/30 font-medium mr-1">بطاقة</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-3.5">
                    {isReturned ? (
                      <span className="inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-rose-600 bg-rose-50">
                        مُرجع
                      </span>
                    ) : (
                      <span className="inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-emerald-700 bg-emerald-50">
                        مكتمل
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </motion.div>
  )
}
