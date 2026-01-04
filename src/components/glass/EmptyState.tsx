"use client"

import { cn } from "@/lib/utils"
import { ReactNode } from "react"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      className
    )}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4 animate-pulse-glow">
          <Icon className="w-8 h-8 text-[var(--text-muted)]" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-[var(--text-muted)] text-sm max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  )
}

