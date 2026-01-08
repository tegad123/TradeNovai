"use client"

import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface ChartCardProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function ChartCard({ title, subtitle, icon, actions, children, className }: ChartCardProps) {
  return (
    <div className={cn("glass-card p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-[hsl(var(--theme-primary))]">{icon}</span>}
          <div>
            <h3 className="text-sm font-medium text-white">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="w-full">{children}</div>
    </div>
  )
}

