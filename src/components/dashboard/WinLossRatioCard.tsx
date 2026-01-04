"use client"

import { cn } from "@/lib/utils"
import { SegmentedBar } from "@/components/ui/segmented-bar"
import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface WinLossRatioCardProps {
  ratio: number
  avgWin: number
  avgLoss: number
  tooltip?: string
  className?: string
}

export function WinLossRatioCard({ 
  ratio, 
  avgWin, 
  avgLoss, 
  tooltip = "Average winning trade size ÷ average losing trade size.",
  className 
}: WinLossRatioCardProps) {
  const absLoss = Math.abs(avgLoss)
  
  const segments = [
    { value: avgWin, className: "bg-emerald-500", ariaLabel: `Average win: $${avgWin}` },
    { value: absLoss, className: "bg-red-500", ariaLabel: `Average loss: $${absLoss}` },
  ]

  return (
    <div className={cn("glass-card p-4", className)}>
      {/* Header with tooltip */}
      <div className="flex items-center gap-1 mb-2">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
          Avg win/loss trade
        </p>
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
      </div>
      
      <div className="flex items-center justify-between mb-3">
        {/* Consistent typography: text-3xl font-bold leading-none */}
        <p className="text-3xl font-bold leading-none text-white">{ratio.toFixed(2)}</p>
        
        {/* Mini segmented bar next to the number */}
        <div className="flex-1 ml-4">
          <SegmentedBar segments={segments} height={8} />
        </div>
      </div>

      {/* Dollar values under the bar */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-emerald-400 font-medium">${avgWin.toLocaleString()}</span>
        <span className="text-red-400 font-medium">-${absLoss.toLocaleString()}</span>
      </div>
    </div>
  )
}
