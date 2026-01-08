"use client"

import { useState, useEffect, useMemo } from "react"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { createClientSafe } from "@/lib/supabase/browser"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DayData {
  date: string
  pnl: number
  trades: number
  winRate: number
}

interface MonthStats {
  totalPnl: number
  totalTrades: number
  winningDays: number
  losingDays: number
  bestDay: number
  worstDay: number
  avgDailyPnl: number
}

export default function CalendarPage() {
  const { user } = useSupabaseAuthContext()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dailyData, setDailyData] = useState<Record<string, DayData>>({})
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)

  // Get current month/year
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Load trades for the current month
  useEffect(() => {
    async function loadTrades() {
      if (!user) return
      
      const supabase = createClientSafe()
      if (!supabase) return

      setLoading(true)

      // Get start and end of month
      const startOfMonth = new Date(currentYear, currentMonth, 1)
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .gte('exit_time', startOfMonth.toISOString())
        .lte('exit_time', endOfMonth.toISOString())

      if (trades) {
        // Group by day
        const grouped: Record<string, { pnl: number; trades: number; wins: number }> = {}
        
        trades.forEach(trade => {
          if (!trade.exit_time) return // Skip trades without exit_time
          const dateKey = new Date(trade.exit_time).toISOString().split('T')[0]
          if (!grouped[dateKey]) {
            grouped[dateKey] = { pnl: 0, trades: 0, wins: 0 }
          }
          grouped[dateKey].pnl += trade.pnl || 0
          grouped[dateKey].trades += 1
          if ((trade.pnl || 0) > 0) {
            grouped[dateKey].wins += 1
          }
        })

        // Convert to DayData format
        const result: Record<string, DayData> = {}
        Object.entries(grouped).forEach(([date, data]) => {
          result[date] = {
            date,
            pnl: data.pnl,
            trades: data.trades,
            winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0
          }
        })

        setDailyData(result)
      }

      setLoading(false)
    }

    loadTrades()
  }, [user, currentMonth, currentYear])

  // Calculate month stats
  const monthStats = useMemo((): MonthStats => {
    const days = Object.values(dailyData)
    if (days.length === 0) {
      return {
        totalPnl: 0,
        totalTrades: 0,
        winningDays: 0,
        losingDays: 0,
        bestDay: 0,
        worstDay: 0,
        avgDailyPnl: 0
      }
    }

    const totalPnl = days.reduce((sum, d) => sum + d.pnl, 0)
    const totalTrades = days.reduce((sum, d) => sum + d.trades, 0)
    const winningDays = days.filter(d => d.pnl > 0).length
    const losingDays = days.filter(d => d.pnl < 0).length
    const bestDay = Math.max(...days.map(d => d.pnl))
    const worstDay = Math.min(...days.map(d => d.pnl))
    const avgDailyPnl = totalPnl / days.length

    return { totalPnl, totalTrades, winningDays, losingDays, bestDay, worstDay, avgDailyPnl }
  }, [dailyData])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = []
    
    // Add empty cells for days before the first
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }, [currentMonth, currentYear])

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Format date key
  const getDateKey = (day: number) => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Get day color based on P&L
  const getDayColor = (pnl: number) => {
    if (pnl > 0) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    if (pnl < 0) return 'bg-red-500/20 text-red-400 border-red-500/30'
    return 'bg-white/5 text-[var(--text-muted)] border-white/10'
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-sm text-[var(--text-muted)]">View your daily P&L performance</p>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-white bg-[hsl(var(--theme-primary))]/10 border border-[hsl(var(--theme-primary))]/30 rounded-lg hover:bg-[hsl(var(--theme-primary))]/20 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Month P&L</p>
          <p className={cn("text-xl font-bold", monthStats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
            ${monthStats.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Total Trades</p>
          <p className="text-xl font-bold text-white">{monthStats.totalTrades}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Winning Days</p>
          <p className="text-xl font-bold text-emerald-400">{monthStats.winningDays}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Losing Days</p>
          <p className="text-xl font-bold text-red-400">{monthStats.losingDays}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Best Day</p>
          <p className="text-xl font-bold text-emerald-400">
            ${monthStats.bestDay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Worst Day</p>
          <p className="text-xl font-bold text-red-400">
            ${monthStats.worstDay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Avg Daily P&L</p>
          <p className={cn("text-xl font-bold", monthStats.avgDailyPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
            ${monthStats.avgDailyPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 glass-card p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-muted)] hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-muted)] hover:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-[var(--text-muted)] py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--theme-primary))]" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const dateKey = getDateKey(day)
                const dayData = dailyData[dateKey]
                const isToday = new Date().toISOString().split('T')[0] === dateKey
                const hasTrades = dayData && dayData.trades > 0

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(dayData || null)}
                    className={cn(
                      "aspect-square rounded-xl border flex flex-col items-center justify-center transition-all hover:scale-105",
                      hasTrades ? getDayColor(dayData.pnl) : "bg-white/5 border-white/10 text-[var(--text-muted)]",
                      isToday && "ring-2 ring-[hsl(var(--theme-primary))]",
                      selectedDay?.date === dateKey && "ring-2 ring-white"
                    )}
                  >
                    <span className={cn("text-sm font-medium", isToday && "text-[hsl(var(--theme-primary))]")}>
                      {day}
                    </span>
                    {hasTrades && (
                      <span className="text-xs font-medium mt-0.5">
                        ${Math.abs(dayData.pnl).toFixed(0)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Day Details Sidebar */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
            Day Details
          </h3>
          
          {selectedDay ? (
            <div className="space-y-4">
              <div className="text-center py-4 border-b border-white/10">
                <p className="text-sm text-[var(--text-muted)] mb-1">
                  {new Date(selectedDay.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className={cn(
                  "text-3xl font-bold",
                  selectedDay.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  {selectedDay.pnl >= 0 ? '+' : ''}{selectedDay.pnl.toLocaleString(undefined, { 
                    style: 'currency', 
                    currency: 'USD' 
                  })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Trades</p>
                  <p className="text-xl font-bold text-white">{selectedDay.trades}</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Win Rate</p>
                  <p className="text-xl font-bold text-white">{selectedDay.winRate.toFixed(0)}%</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mt-4">
                {selectedDay.pnl >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  selectedDay.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  {selectedDay.pnl >= 0 ? 'Winning Day' : 'Losing Day'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="w-12 h-12 text-[var(--text-muted)] mb-4" />
              <p className="text-[var(--text-muted)]">
                Select a day to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
