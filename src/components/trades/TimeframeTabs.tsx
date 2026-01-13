"use client"

import { cn } from "@/lib/utils"
import { TimeframeOption } from "@/lib/types/trades"

interface TimeframeTabsProps {
  value: TimeframeOption
  onChange: (value: TimeframeOption) => void
  className?: string
}

const timeframes: { value: TimeframeOption; label: string }[] = [
  { value: "7D", label: "7D" },
  { value: "14D", label: "14D" },
  { value: "30D", label: "30D" },
  { value: "90D", label: "90D" },
  { value: "allTime", label: "All" },
  { value: "thisMonth", label: "This Month" },
]

export function TimeframeTabs({ value, onChange, className }: TimeframeTabsProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10", className)}>
      {timeframes.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
            value === tf.value
              ? "bg-[hsl(var(--theme-primary))] text-black"
              : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
          )}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}

