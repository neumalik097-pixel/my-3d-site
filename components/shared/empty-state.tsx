import { type LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rivo-green/[0.06] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-rivo-green/40" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-semibold text-black/60 mb-1">{title}</p>
      <p className="text-[13px] text-black/35 mb-6 max-w-xs leading-relaxed">{description}</p>
      {action}
    </div>
  )
}
