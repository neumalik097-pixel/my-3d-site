"use client"

import { useState, useEffect, useRef } from "react"
import { ImagePlus, X as XIcon } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  inventorySchema, InventoryFormValues, InventoryItem, INVENTORY_STATUS_LABELS,
} from "@/types/inventory"
import { formatIQD } from "@/lib/currency"

type FormErrors = Partial<Record<keyof InventoryFormValues, string>>

const EMPTY: InventoryFormValues = {
  name: "", buyPrice: 0, sellPrice: 0, stock: 0,
  lowStockThreshold: undefined, status: "active", imageUrl: undefined,
}

export interface InventoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: InventoryItem | null
  onSubmit: (data: InventoryFormValues) => void
  labels: { add: string; edit: string; namePlaceholder: string }
  showLowStockThreshold?: boolean
}

export function InventoryFormDialog({
  open, onOpenChange, initial, onSubmit, labels, showLowStockThreshold = false,
}: InventoryFormDialogProps) {
  const [values, setValues] = useState<InventoryFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [imageError, setImageError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValues(
        initial
          ? { name: initial.name, buyPrice: initial.buyPrice, sellPrice: initial.sellPrice, stock: initial.stock, lowStockThreshold: initial.lowStockThreshold, status: initial.status, imageUrl: initial.imageUrl }
          : EMPTY
      )
      setErrors({})
      setImageError(null)
    }
  }, [open, initial])

  const set = <K extends keyof InventoryFormValues>(key: K, val: InventoryFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: val }))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("يجب أن يكون الملف JPG أو PNG أو WEBP")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError("حجم الصورة يجب ألا يتجاوز 2 ميغابايت")
      return
    }
    setImageError(null)
    const reader = new FileReader()
    reader.onload = (ev) => set("imageUrl", ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const validate = (): boolean => {
    const result = inventorySchema.safeParse(values)
    if (!result.success) {
      const errs: FormErrors = {}
      for (const issue of result.error.issues) {
        errs[issue.path[0] as keyof InventoryFormValues] = issue.message
      }
      setErrors(errs)
      return false
    }
    setErrors({})
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(values)
    onOpenChange(false)
  }

  const netProfit = (values.sellPrice || 0) - (values.buyPrice || 0)
  const isEditing = !!initial

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEditing ? labels.edit : labels.add}</DialogTitle>
          <DialogDescription>
            {isEditing ? "عدّل البيانات ثم احفظ التغييرات." : "أدخل بيانات العنصر الجديد."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2" noValidate>
          {/* Image upload */}
          <div className="space-y-1.5">
            <Label>صورة المنتج</Label>
            <div className="flex items-center gap-3">
              {values.imageUrl ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-black/[0.08]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={values.imageUrl} alt="معاينة" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { set("imageUrl", undefined); if (fileRef.current) fileRef.current.value = "" }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white"
                  >
                    <XIcon className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-black/[0.04] ring-1 ring-black/[0.06] flex items-center justify-center flex-shrink-0">
                  <ImagePlus className="w-5 h-5 text-black/25" strokeWidth={1.8} />
                </div>
              )}
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-[12px] font-medium text-rivo-green hover:text-rivo-green/80 transition-colors"
                >
                  {values.imageUrl ? "تغيير الصورة" : "رفع صورة"}
                </button>
                <p className="text-[11px] text-black/35 mt-0.5">JPG، PNG، WEBP — حد أقصى 2MB</p>
                {imageError && <p className="text-[11px] text-rose-500 mt-0.5">{imageError}</p>}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-name">الاسم <span className="text-rose-500">*</span></Label>
            <Input id="inv-name" dir="rtl" placeholder={labels.namePlaceholder} value={values.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} className="h-9 text-[13px]" />
            {errors.name && <p className="text-[11px] text-rose-500">{errors.name}</p>}
          </div>

          {/* Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-buy">سعر الشراء (د.ع)</Label>
              <Input id="inv-buy" dir="ltr" type="number" min={0} step={100} placeholder="0" value={values.buyPrice} onChange={(e) => set("buyPrice", Number(e.target.value))} aria-invalid={!!errors.buyPrice} className="h-9 text-[13px] text-left" />
              {errors.buyPrice && <p className="text-[11px] text-rose-500">{errors.buyPrice}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-sell">سعر البيع (د.ع)</Label>
              <Input id="inv-sell" dir="ltr" type="number" min={0} step={100} placeholder="0" value={values.sellPrice} onChange={(e) => set("sellPrice", Number(e.target.value))} aria-invalid={!!errors.sellPrice} className="h-9 text-[13px] text-left" />
              {errors.sellPrice && <p className="text-[11px] text-rose-500">{errors.sellPrice}</p>}
            </div>
          </div>

          {/* Net profit */}
          <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-medium ${netProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
            <span>صافي الربح المتوقع</span>
            <span className="font-bold tabular-nums">{formatIQD(netProfit)}</span>
          </div>

          {/* Stock row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-stock">الكمية في المخزون</Label>
              <Input id="inv-stock" dir="ltr" type="number" min={0} step={1} placeholder="0" value={values.stock} onChange={(e) => set("stock", Number(e.target.value))} aria-invalid={!!errors.stock} className="h-9 text-[13px] text-left" />
              {errors.stock && <p className="text-[11px] text-rose-500">{errors.stock}</p>}
            </div>
            {showLowStockThreshold && (
              <div className="space-y-1.5">
                <Label htmlFor="inv-threshold">تنبيه نفاد المخزون</Label>
                <Input id="inv-threshold" dir="ltr" type="number" min={0} step={1} placeholder="اختياري" value={values.lowStockThreshold ?? ""} onChange={(e) => set("lowStockThreshold", e.target.value === "" ? undefined : Number(e.target.value))} className="h-9 text-[13px] text-left" />
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select value={values.status} onValueChange={(v) => set("status", v as InventoryFormValues["status"])}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="active">{INVENTORY_STATUS_LABELS.active}</SelectItem>
                <SelectItem value="archived">{INVENTORY_STATUS_LABELS.archived}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter dir="rtl" className="gap-2">
          <Button type="button" onClick={handleSubmit as unknown as React.MouseEventHandler} className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90">
            {isEditing ? "حفظ التغييرات" : "إضافة"}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
