"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { barberSchema, BarberFormValues, Barber, STATUS_LABELS } from "@/types/barber"

type FormErrors = Partial<Record<keyof BarberFormValues, string>>

const EMPTY: BarberFormValues = {
  name: "",
  phone: "",
  commissionPct: 20,
  status: "active",
}

interface BarberFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Barber | null
  onSubmit: (data: BarberFormValues) => void
}

export function BarberFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: BarberFormDialogProps) {
  const [values, setValues] = useState<BarberFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (open) {
      setValues(
        initial
          ? {
              name: initial.name,
              phone: initial.phone ?? "",
              commissionPct: initial.commissionPct,
              status: initial.status,
            }
          : EMPTY
      )
      setErrors({})
    }
  }, [open, initial])

  const set = <K extends keyof BarberFormValues>(key: K, val: BarberFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: val }))

  const validate = (): boolean => {
    const result = barberSchema.safeParse(values)
    if (!result.success) {
      const errs: FormErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof BarberFormValues
        errs[key] = issue.message
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

  const isEditing = !!initial

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "تعديل بيانات الحلاق" : "إضافة حلاق جديد"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "قم بتعديل بيانات الحلاق ثم احفظ التغييرات." : "أدخل بيانات الحلاق الجديد."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2" noValidate>
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="barber-name">
              الاسم <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="barber-name"
              dir="rtl"
              placeholder="اسم الحلاق"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={!!errors.name}
              className="h-9 text-[13px]"
            />
            {errors.name && (
              <p className="text-[11px] text-rose-500">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="barber-phone">رقم الجوال</Label>
            <Input
              id="barber-phone"
              dir="ltr"
              type="tel"
              placeholder="05xxxxxxxx"
              value={values.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              className="h-9 text-[13px] text-left"
            />
          </div>

          {/* Commission */}
          <div className="space-y-1.5">
            <Label htmlFor="barber-commission">
              نسبة العمولة (%) <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="barber-commission"
                dir="ltr"
                type="number"
                min={0}
                max={100}
                step={1}
                placeholder="20"
                value={values.commissionPct}
                onChange={(e) => set("commissionPct", Number(e.target.value))}
                aria-invalid={!!errors.commissionPct}
                className="h-9 text-[13px] text-left pl-8"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-black/40 pointer-events-none">
                %
              </span>
            </div>
            {errors.commissionPct && (
              <p className="text-[11px] text-rose-500">{errors.commissionPct}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select
              value={values.status}
              onValueChange={(v) => set("status", v as BarberFormValues["status"])}
            >
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="active">{STATUS_LABELS.active}</SelectItem>
                <SelectItem value="on_break">{STATUS_LABELS.on_break}</SelectItem>
                <SelectItem value="archived">{STATUS_LABELS.archived}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter dir="rtl" className="gap-2">
          <Button
            type="button"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            className="bg-rivo-green text-rivo-cream hover:bg-rivo-green/90"
          >
            {isEditing ? "حفظ التغييرات" : "إضافة الحلاق"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
