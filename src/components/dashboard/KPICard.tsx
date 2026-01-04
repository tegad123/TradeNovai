"use client"

import { cn } from "@/lib/utils"
import { ReactNode } from "react"
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface KPICardProps {
  title: string
  tooltip?: string
  value: string | number
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  icon?: ReactNode
  className?: string
}

export function KPICard({ 
  title, 
  tooltip,
  value, 
  subtitle, 
  trend, 
  trendValue, 
  icon,
  className 
}: KPICardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  return (
    <div className={cn("glass-card p-4", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header with tooltip */}
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{title}</p>
            {tooltip && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-[var(--text-muted)] opacity-60 hover:opacity-100 cursor-help transition-opacity" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {/* Consistent typography: text-3xl font-bold leading-none */}
          <p className="text-3xl font-bold leading-none text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--theme-primary))]/10 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className="flex items-center gap-1 mt-3">
          <TrendIcon className={cn(
            "w-3.5 h-3.5",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-red-400",
            trend === "neutral" && "text-[var(--text-muted)]"
          )} />
          <span className={cn(
            "text-xs font-medium",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-red-400",
            trend === "neutral" && "text-[var(--text-muted)]"
          )}>
            {trendValue}
          </span>
        </div>
      )}
    </div>
  )
}
