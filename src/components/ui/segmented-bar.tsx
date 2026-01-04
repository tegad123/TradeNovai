"use client"

import { cn } from "@/lib/utils"

interface Segment {
  value: number
  className: string
  ariaLabel?: string
}

interface SegmentedBarProps {
  segments: Segment[]
  height?: number
  className?: string
  minSegmentWidth?: number
}

export function SegmentedBar({ 
  segments, 
  height = 10, 
  className,
  minSegmentWidth = 4 
}: SegmentedBarProps) {
  const total = segments.reduce((sum, seg) => sum + Math.abs(seg.value), 0)
  
  // Handle total=0 gracefully
  if (total === 0) {
    return (
      <div 
        className={cn("w-full rounded-full bg-white/10", className)}
        style={{ height }}
        role="progressbar"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    )
  }

  // Calculate widths with minimum width for visibility
  const segmentWidths = segments.map(seg => {
    const rawPercent = (Math.abs(seg.value) / total) * 100
    // If value is non-zero but would be too small, give it minimum width
    if (seg.value !== 0 && rawPercent < (minSegmentWidth / 100) * 100) {
      return minSegmentWidth
    }
    return rawPercent
  })

  // Normalize widths if they exceed 100%
  const totalWidth = segmentWidths.reduce((sum, w) => sum + w, 0)
  const normalizedWidths = totalWidth > 100 
    ? segmentWidths.map(w => (w / totalWidth) * 100)
    : segmentWidths

  return (
    <div 
      className={cn("w-full rounded-full bg-white/10 flex overflow-hidden", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={total}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {segments.map((segment, index) => {
        if (segment.value === 0) return null
        
        return (
          <div
            key={index}
            className={cn(
              "h-full transition-all duration-300",
              segment.className,
              index === 0 && "rounded-l-full",
              index === segments.length - 1 && "rounded-r-full"
            )}
            style={{ width: `${normalizedWidths[index]}%` }}
            aria-label={segment.ariaLabel}
          />
        )
      })}
    </div>
  )
}

