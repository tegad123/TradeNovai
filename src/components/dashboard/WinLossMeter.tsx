"use client"

import { cn } from "@/lib/utils"

interface WinLossMeterProps {
  wins: number
  losses: number
  size?: "sm" | "md"
  className?: string
}

export function WinLossMeter({ 
  wins, 
  losses, 
  size = "md",
  className 
}: WinLossMeterProps) {
  const total = wins + losses
  
  // Calculate arc percentages (only wins and losses, no breakeven)
  const winRatio = total > 0 ? wins / total : 0.5
  const lossRatio = total > 0 ? losses / total : 0.5
  
  // Arc path calculation (semi-circle from left to right)
  const arcLength = 157 // Approximate length of semi-circle path
  const winArc = winRatio * arcLength
  const lossArc = lossRatio * arcLength

  const dimensions = size === "sm" 
    ? { width: "w-16", height: "h-8", strokeWidth: 6 }
    : { width: "w-20", height: "h-10", strokeWidth: 8 }

  return (
    <div className={cn("relative", dimensions.width, dimensions.height, className)}>
      <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
        {/* Background arc (gray) */}
        <path
          d="M 5 45 A 40 40 0 0 1 95 45"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={dimensions.strokeWidth}
          strokeLinecap="round"
        />
        {/* Win arc (green) - starts from left */}
        <path
          d="M 5 45 A 40 40 0 0 1 95 45"
          fill="none"
          stroke="#10b981"
          strokeWidth={dimensions.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${winArc} ${arcLength}`}
          className="transition-all duration-500"
        />
        {/* Loss arc (red) - starts from right */}
        <path
          d="M 95 45 A 40 40 0 0 0 5 45"
          fill="none"
          stroke="#ef4444"
          strokeWidth={dimensions.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${lossArc} ${arcLength}`}
          className="transition-all duration-500"
        />
      </svg>
    </div>
  )
}

