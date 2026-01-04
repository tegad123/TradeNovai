"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { CalendarDay } from "@/lib/types/trades"

interface CalendarSidebarProps {
  dailyPnl: CalendarDay[]
  selectedDate: string | null
  onDateSelect: (date: string) => void
  className?: string
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export function CalendarSidebar({ 
  dailyPnl, 
  selectedDate, 
  onDateSelect,
  className 
}: CalendarSidebarProps) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())

  // Create a map of date -> pnl for quick lookup
  const pnlMap = useMemo(() => {
    const map = new Map<string, number | null>()
    dailyPnl.forEach(day => {
      map.set(day.date, day.netPnl)
    })
    return map
  }, [dailyPnl])

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const startPadding = firstDay.getDay()
    const totalDays = lastDay.getDate()
    
    const days: { date: string | null; day: number | null; isCurrentMonth: boolean }[] = []
    
    // Padding for start of month
    for (let i = 0; i < startPadding; i++) {
      const prevMonthDay = new Date(viewYear, viewMonth, -startPadding + i + 1)
      days.push({
        date: prevMonthDay.toISOString().split("T")[0],
        day: prevMonthDay.getDate(),
        isCurrentMonth: false,
      })
    }
    
    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(viewYear, viewMonth, i)
      days.push({
        date: date.toISOString().split("T")[0],
        day: i,
        isCurrentMonth: true,
      })
    }
    
    // Padding for end of month (fill to 42 cells for 6 rows)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const nextMonthDay = new Date(viewYear, viewMonth + 1, i)
      days.push({
        date: nextMonthDay.toISOString().split("T")[0],
        day: i,
        isCurrentMonth: false,
      })
    }
    
    return days
  }, [viewMonth, viewYear])

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const todayStr = today.toISOString().split("T")[0]

  return (
    <div className={cn("glass-card p-4", className)}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-muted)] hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-white">
          {MONTHS[viewMonth]} {viewYear}
        </h3>
        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-muted)] hover:text-white"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-[var(--text-muted)] py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayInfo, index) => {
          if (!dayInfo.date) return <div key={index} className="aspect-square" />
          
          const pnl = pnlMap.get(dayInfo.date)
          const isSelected = selectedDate === dayInfo.date
          const isToday = dayInfo.date === todayStr
          const hasTrades = pnl !== null && pnl !== undefined
          
          // Determine background color based on P&L
          let bgClass = ""
          if (hasTrades && dayInfo.isCurrentMonth) {
            if (pnl > 0) {
              bgClass = "bg-emerald-500/20 hover:bg-emerald-500/30"
            } else if (pnl < 0) {
              bgClass = "bg-red-500/20 hover:bg-red-500/30"
            } else {
              bgClass = "bg-white/5 hover:bg-white/10"
            }
          } else if (dayInfo.isCurrentMonth) {
            bgClass = "hover:bg-white/5"
          }

          return (
            <button
              key={index}
              onClick={() => hasTrades && onDateSelect(dayInfo.date!)}
              disabled={!hasTrades || !dayInfo.isCurrentMonth}
              className={cn(
                "aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all relative",
                dayInfo.isCurrentMonth 
                  ? "text-white" 
                  : "text-[var(--text-muted)]/30",
                bgClass,
                isSelected && "ring-2 ring-[hsl(var(--theme-primary))] ring-offset-1 ring-offset-black",
                isToday && dayInfo.isCurrentMonth && "font-bold",
                hasTrades && dayInfo.isCurrentMonth ? "cursor-pointer" : "cursor-default"
              )}
            >
              {dayInfo.day}
              {isToday && dayInfo.isCurrentMonth && (
                <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[hsl(var(--theme-primary))]" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500/30" />
          <span className="text-[10px] text-[var(--text-muted)]">Profit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/30" />
          <span className="text-[10px] text-[var(--text-muted)]">Loss</span>
        </div>
      </div>
    </div>
  )
}

