"use client"

import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DayPnL {
  date: number
  pnl: number | null
  isCurrentMonth: boolean
}

interface WeekData {
  days: DayPnL[]
  weeklyTotal: number
}

interface CalendarPnLViewProps {
  month: string
  year: number
  weeks: WeekData[]
  monthlyTotal: number
  onPrevMonth?: () => void
  onNextMonth?: () => void
  className?: string
}

export function CalendarPnLView({
  month,
  year,
  weeks,
  monthlyTotal,
  onPrevMonth,
  onNextMonth,
  className
}: CalendarPnLViewProps) {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const getPnLColor = (pnl: number | null) => {
    if (pnl === null) return ""
    if (pnl > 0) return "bg-emerald-500/20 text-emerald-400"
    if (pnl < 0) return "bg-red-500/20 text-red-400"
    return "bg-white/5 text-[var(--text-muted)]"
  }

  return (
    <div className={cn("glass-card p-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-white">Monthly P&L Calendar</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Daily and weekly performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="glass" size="icon" onClick={onPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-white min-w-[120px] text-center">
            {month} {year}
          </span>
          <Button variant="glass" size="icon" onClick={onNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-8 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-[10px] text-[var(--text-muted)] py-1">
            {day}
          </div>
        ))}
        <div className="text-center text-[10px] text-[var(--text-muted)] py-1">Week</div>
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-8 gap-1">
            {week.days.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className={cn(
                  "aspect-[1.5] rounded-md flex flex-col items-center justify-center text-xs p-1",
                  day.isCurrentMonth ? getPnLColor(day.pnl) : "opacity-30",
                  !day.isCurrentMonth && "bg-white/5"
                )}
              >
                <span className="text-[10px] text-[var(--text-muted)]">{day.date}</span>
                {day.pnl !== null && day.isCurrentMonth && (
                  <span className="font-medium">
                    {day.pnl >= 0 ? "+" : ""}{day.pnl.toFixed(0)}
                  </span>
                )}
              </div>
            ))}
            {/* Weekly total */}
            <div className={cn(
              "aspect-[1.5] rounded-md flex flex-col items-center justify-center text-xs font-medium",
              week.weeklyTotal >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            )}>
              <span className="text-[10px] text-[var(--text-muted)]">Total</span>
              <span>{week.weeklyTotal >= 0 ? "+" : ""}{week.weeklyTotal.toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly total */}
      <div className={cn(
        "mt-4 p-3 rounded-lg flex items-center justify-between",
        monthlyTotal >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
      )}>
        <span className="text-sm text-[var(--text-secondary)]">Monthly Total</span>
        <span className={cn(
          "text-lg font-bold",
          monthlyTotal >= 0 ? "text-emerald-400" : "text-red-400"
        )}>
          {monthlyTotal >= 0 ? "+" : ""}${monthlyTotal.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

