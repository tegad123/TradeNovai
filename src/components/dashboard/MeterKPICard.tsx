"use client"

import { cn } from "@/lib/utils"
import { Info } from "lucide-react"
import { WinLossMeter } from "./WinLossMeter"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MeterKPICardProps {
  title: string
  tooltip?: string
  value: number
  valueFormat?: "percent" | "number"
  wins: number
  losses: number
  className?: string
}

export function MeterKPICard({ 
  title,
  tooltip,
  value,
  valueFormat = "percent",
  wins, 
  losses,
  className 
}: MeterKPICardProps) {
  const formattedValue = valueFormat === "percent" 
    ? `${value.toFixed(2)}%` 
    : value.toFixed(2)

  return (
    <div className={cn("glass-card p-4", className)}>
      {/* Header with tooltip */}
      <div className="flex items-center gap-1 mb-2">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
          {title}
        </p>
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
      
      {/* Value and Meter row */}
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold leading-none text-white">{formattedValue}</p>
        <WinLossMeter wins={wins} losses={losses} />
      </div>

      {/* Pill counts */}
      <div className="flex items-center justify-end gap-2 mt-3">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20">
          <span className="text-xs font-semibold text-emerald-400">{wins}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20">
          <span className="text-xs font-semibold text-red-400">{losses}</span>
        </div>
      </div>
    </div>
  )
}

