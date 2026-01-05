"use client"

import { useState, useMemo } from "react"
import { Calendar, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface DateRange {
  start: Date
  end: Date
}

type PresetId = "all" | "thisMonth" | "last30" | "thisWeek" | "custom"

interface Preset {
  id: PresetId
  label: string
}

const PRESETS: Preset[] = [
  { id: "all", label: "All time" },
  { id: "thisMonth", label: "This month" },
  { id: "last30", label: "Last 30 days" },
  { id: "thisWeek", label: "This week" },
  { id: "custom", label: "Custom range" },
]

interface DateRangePickerProps {
  range: DateRange
  dataRange: DateRange | null // min/max from actual trades
  onRangeChange: (range: DateRange) => void
  className?: string
}

export function DateRangePicker({
  range,
  dataRange,
  onRangeChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [activePreset, setActivePreset] = useState<PresetId>("all")
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [customError, setCustomError] = useState<string | null>(null)

  // Format the range for display
  const rangeLabel = useMemo(() => {
    const startStr = range.start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    const endStr = range.end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    return `${startStr} – ${endStr}`
  }, [range])

  // Calculate preset ranges
  function getPresetRange(presetId: PresetId): DateRange {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    switch (presetId) {
      case "all":
        if (dataRange) {
          return dataRange
        }
        // Fallback to this month if no data
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
          end: today,
        }

      case "thisMonth":
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
          end: today,
        }

      case "last30":
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        thirtyDaysAgo.setHours(0, 0, 0, 0)
        return {
          start: thirtyDaysAgo,
          end: today,
        }

      case "thisWeek":
        const dayOfWeek = now.getDay()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - dayOfWeek)
        startOfWeek.setHours(0, 0, 0, 0)
        return {
          start: startOfWeek,
          end: today,
        }

      case "custom":
        return range // Keep current range for custom

      default:
        return range
    }
  }

  function handlePresetClick(presetId: PresetId) {
    setActivePreset(presetId)
    setCustomError(null)

    if (presetId === "custom") {
      setShowCustom(true)
      // Pre-fill with current range
      setCustomStart(range.start.toISOString().split("T")[0])
      setCustomEnd(range.end.toISOString().split("T")[0])
    } else {
      setShowCustom(false)
      const newRange = getPresetRange(presetId)
      onRangeChange(newRange)
      setOpen(false)
    }
  }

  function handleApplyCustom() {
    setCustomError(null)

    if (!customStart || !customEnd) {
      setCustomError("Please select both start and end dates")
      return
    }

    const startDate = new Date(customStart)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(customEnd)
    endDate.setHours(23, 59, 59, 999)

    if (startDate > endDate) {
      setCustomError("Start date must be before end date")
      return
    }

    onRangeChange({ start: startDate, end: endDate })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="glass"
          size="sm"
          className={cn(
            "h-9 px-3 gap-2 text-sm font-normal",
            "border-white/10 hover:border-white/20",
            className
          )}
        >
          <Calendar className="h-4 w-4 text-[hsl(var(--theme-primary))]" />
          <span className="hidden sm:inline">{rangeLabel}</span>
          <span className="sm:hidden">Date</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-2">
          <div className="text-xs font-medium text-white/50 uppercase tracking-wider px-2 py-1.5">
            Date Range
          </div>
          
          {/* Preset options */}
          <div className="space-y-0.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-2 rounded-md text-sm transition-colors",
                  activePreset === preset.id
                    ? "bg-[hsl(var(--theme-primary))]/20 text-[hsl(var(--theme-primary))]"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <span>{preset.label}</span>
                {activePreset === preset.id && preset.id !== "custom" && (
                  <Check className="h-4 w-4" />
                )}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          {showCustom && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-white/50 block">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => {
                    setCustomStart(e.target.value)
                    setCustomError(null)
                  }}
                  className={cn(
                    "w-full px-3 py-2 rounded-md text-sm",
                    "bg-white/5 border border-white/10",
                    "text-white placeholder:text-white/30",
                    "focus:outline-none focus:ring-1 focus:ring-[hsl(var(--theme-primary))] focus:border-[hsl(var(--theme-primary))]"
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/50 block">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => {
                    setCustomEnd(e.target.value)
                    setCustomError(null)
                  }}
                  className={cn(
                    "w-full px-3 py-2 rounded-md text-sm",
                    "bg-white/5 border border-white/10",
                    "text-white placeholder:text-white/30",
                    "focus:outline-none focus:ring-1 focus:ring-[hsl(var(--theme-primary))] focus:border-[hsl(var(--theme-primary))]"
                  )}
                />
              </div>

              {customError && (
                <p className="text-xs text-red-400">{customError}</p>
              )}

              <Button
                variant="glass-theme"
                size="sm"
                className="w-full"
                onClick={handleApplyCustom}
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

