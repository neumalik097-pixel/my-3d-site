import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-rivo-green/10 text-rivo-green",
        active: "bg-emerald-50 text-emerald-700",
        on_break: "bg-amber-50 text-amber-700",
        archived: "bg-slate-100 text-slate-500",
        destructive: "bg-rose-50 text-rose-600",
        warning: "bg-orange-50 text-orange-600",
        outline: "border border-black/10 text-black/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
