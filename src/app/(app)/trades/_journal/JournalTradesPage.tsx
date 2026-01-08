"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Plus, Filter, ChevronDown, ChevronUp, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"
import { AddTradesWizard } from "@/components/add-trades"
import {
  TimeframeTabs,
  CalendarSidebar,
  DayAccordion,
} from "@/components/trades"
import { TimeframeOption, DayData, CalendarDay, Trade, DayEquityPoint } from "@/lib/types/trades"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { createClientSafe } from "@/lib/supabase/browser"

// Helper to format date label
function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// Get date range based on timeframe
function getDateRange(timeframe: TimeframeOption): { start: Date; end: Date } {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  
  switch (timeframe) {
    case "7D":
      start.setDate(start.getDate() - 7)
      break
    case "14D":
      start.setDate(start.getDate() - 14)
      break
    case "30D":
      start.setDate(start.getDate() - 30)
      break
    case "thisMonth":
      start.setDate(1)
      break
    default:
      start.setDate(start.getDate() - 30)
  }
  
  return { start, end }
}

// Process trades into day data
function processTradesIntoDays(trades: Array<{
  id: string
  symbol: string
  side: string
  quantity: number
  entry_price: number
  exit_price: number
  pnl: number
  entry_time: string
  exit_time: string
  fees: number
}>): { days: DayData[]; calendarDays: CalendarDay[] } {
  // Group trades by date
  const tradesByDate: Record<string, typeof trades> = {}
  
  trades.forEach(trade => {
    if (!trade.exit_time) return // Skip trades without exit_time
    const dateKey = new Date(trade.exit_time).toISOString().split('T')[0]
    if (!tradesByDate[dateKey]) {
      tradesByDate[dateKey] = []
    }
    tradesByDate[dateKey].push(trade)
  })
  
  // Process each day
  const days: DayData[] = []
  const calendarDays: CalendarDay[] = []
  
  // Get all dates in the range
  const allDates = Object.keys(tradesByDate).sort((a, b) => b.localeCompare(a))
  
  allDates.forEach(dateStr => {
    const dayTrades = tradesByDate[dateStr]
    
    // Convert to Trade format
    const formattedTrades: Trade[] = dayTrades.map(t => ({
      id: t.id,
      symbol: t.symbol || 'Unknown',
      side: (t.side?.toUpperCase() || 'LONG') as "LONG" | "SHORT",
      quantity: t.quantity || 0,
      entryPrice: t.entry_price || 0,
      exitPrice: t.exit_price || 0,
      entryTime: t.entry_time || '',
      exitTime: t.exit_time || '',
      pnl: t.pnl || 0,
      commission: t.fees || 0,
      fee: 0,
      instrumentType: "future" as const,
    }))
    
    // Calculate stats
    const winners = formattedTrades.filter(t => t.pnl > 0)
    const losers = formattedTrades.filter(t => t.pnl <= 0)
    
    const grossPnl = formattedTrades.reduce((sum, t) => sum + t.pnl, 0)
    const commissions = formattedTrades.reduce((sum, t) => sum + t.commission + t.fee, 0)
    const netPnl = grossPnl - commissions
    
    const winSum = winners.reduce((sum, t) => sum + t.pnl, 0)
    const lossSum = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0))
    const profitFactor = lossSum > 0 ? winSum / lossSum : winSum > 0 ? Infinity : 0
    
    const volume = formattedTrades.reduce((sum, t) => sum + t.quantity, 0)
    
    // Generate equity series
    const equitySeries: DayEquityPoint[] = []
    let cumulative = 0
    if (formattedTrades.length > 0) {
      equitySeries.push({ time: "09:30", value: 0 })
      formattedTrades.forEach(trade => {
        cumulative += trade.pnl - trade.commission - trade.fee
        const timeParts = trade.exitTime.split('T')[1]?.split(':') || ['12', '00']
        equitySeries.push({
          time: `${timeParts[0]}:${timeParts[1]}`,
          value: Math.round(cumulative * 100) / 100,
        })
      })
      equitySeries.push({ time: "16:00", value: cumulative })
    }
    
    days.push({
      date: dateStr,
      dayLabel: formatDayLabel(dateStr),
      netPnl: Math.round(netPnl * 100) / 100,
      grossPnl: Math.round(grossPnl * 100) / 100,
      commissions: Math.round(commissions * 100) / 100,
      volume,
      profitFactor: isFinite(profitFactor) ? Math.round(profitFactor * 100) / 100 : 0,
      totalTrades: formattedTrades.length,
      winners: winners.length,
      losers: losers.length,
      winrate: formattedTrades.length > 0 ? Math.round((winners.length / formattedTrades.length) * 100) : 0,
      equitySeries,
      trades: formattedTrades,
    })
    
    calendarDays.push({
      date: dateStr,
      netPnl,
      hasTrades: true,
    })
  })
  
  return { days, calendarDays }
}

export default function TradesPage() {
  const { user } = useSupabaseAuthContext()
  const [addTradesOpen, setAddTradesOpen] = useState(false)
  const [timeframe, setTimeframe] = useState<TimeframeOption>("30D")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [accountType, setAccountType] = useState<"demo" | "live">("live")
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<DayData[]>([])
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Fetch trades from database
  useEffect(() => {
    async function fetchTrades() {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trades:fetchTrades:entry',message:'fetchTrades called',data:{hasUser:!!user,userId:user?.id?.slice(-6),accountType,timeframe},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2'})}).catch(()=>{});
      // #endregion

      if (!user) {
        setLoading(false)
        setDays([])
        setCalendarDays([])
        return
      }

      const supabase = createClientSafe()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trades:fetchTrades:supabase',message:'Supabase client check',data:{hasSupabase:!!supabase},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      if (!supabase) {
        setLoading(false)
        return
      }

      setLoading(true)

      const { start, end } = getDateRange(timeframe)

      // Fetch trades for the selected timeframe
      // For now, we treat "live" as real data and "demo" as no data
      // In a real app, you'd have an account_id field to filter by
      if (accountType === "demo") {
        setDays([])
        setCalendarDays([])
        setLoading(false)
        return
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trades:fetchTrades:beforeQuery',message:'About to query trades',data:{userId:user.id.slice(-6),startDate:start.toISOString().split('T')[0],endDate:end.toISOString().split('T')[0]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3,H4'})}).catch(()=>{});
      // #endregion

      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .gte('exit_time', start.toISOString())
        .lte('exit_time', end.toISOString())
        .order('exit_time', { ascending: false })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trades:fetchTrades:afterQuery',message:'Query result',data:{hasError:!!error,errorMessage:error?.message,tradesCount:trades?.length||0,firstTradeId:trades?.[0]?.id?.slice(-6),firstTradeStatus:trades?.[0]?.status,firstTradeExitTime:trades?.[0]?.exit_time},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3,H4'})}).catch(()=>{});
      // #endregion

      if (error) {
        console.error('Error fetching trades:', error)
        setLoading(false)
        return
      }

      if (trades && trades.length > 0) {
        const { days: processedDays, calendarDays: processedCalendar } = processTradesIntoDays(trades)
        setDays(processedDays)
        setCalendarDays(processedCalendar)
      } else {
        setDays([])
        setCalendarDays([])
      }

      setLoading(false)
    }

    fetchTrades()
  }, [user, timeframe, accountType])

  // Filter days based on search
  const filteredDays = useMemo(() => {
    if (!searchQuery.trim()) return days
    const query = searchQuery.toLowerCase()
    return days.filter(day => 
      day.trades.some(trade => 
        trade.symbol.toLowerCase().includes(query)
      )
    )
  }, [days, searchQuery])

  // Initialize with first day expanded
  useEffect(() => {
    if (filteredDays.length > 0 && expandedDays.size === 0) {
      setExpandedDays(new Set([filteredDays[0].date]))
    }
  }, [filteredDays, expandedDays.size])

  // Expand all days
  const expandAll = useCallback(() => {
    setExpandedDays(new Set(filteredDays.map((d) => d.date)))
  }, [filteredDays])

  // Collapse all days
  const collapseAll = useCallback(() => {
    setExpandedDays(new Set())
  }, [])

  // Toggle day expansion
  const toggleDay = useCallback((date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }, [])

  // Handle calendar date selection
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date)
    setExpandedDays((prev) => {
      const next = new Set(Array.from(prev))
      next.add(date)
      return next
    })
    
    // Scroll to the day
    const element = dayRefs.current.get(date)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalPnl = filteredDays.reduce((sum, day) => sum + day.netPnl, 0)
    const totalTrades = filteredDays.reduce((sum, day) => sum + day.totalTrades, 0)
    const winningDays = filteredDays.filter((day) => day.netPnl > 0).length
    const losingDays = filteredDays.filter((day) => day.netPnl < 0).length
    return { totalPnl, totalTrades, winningDays, losingDays }
  }, [filteredDays])

  const hasTrades = days.length > 0

  // Handle trade added - refresh data
  const handleTradeAdded = useCallback(() => {
    // Reload the page to get fresh data
    window.location.reload()
  }, [])

  return (
    <PageContainer className="pb-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Day View</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Review your trades organized by trading day
            </p>
          </div>
          
          <Button
            variant="glass-theme"
            onClick={() => setAddTradesOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Trades
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Timeframe tabs */}
            <TimeframeTabs value={timeframe} onChange={setTimeframe} />

            {/* Account selector */}
            <div className="relative">
              <select 
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as "demo" | "live")}
                className="appearance-none px-4 py-2 pr-8 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 cursor-pointer"
              >
                <option value="live" className="bg-gray-900">Live Account</option>
                <option value="demo" className="bg-gray-900">Demo Account</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            </div>

            {/* Filters button */}
            <Button variant="glass" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
            />
          </div>
        </div>

        {/* Summary stats bar */}
        {hasTrades && (
          <div className="flex flex-wrap items-center gap-6 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Period P&L:</span>
              <span className={cn(
                "text-sm font-semibold",
                summaryStats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {summaryStats.totalPnl >= 0 ? "+" : ""}${summaryStats.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Total Trades:</span>
              <span className="text-sm font-semibold text-white">{summaryStats.totalTrades}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Win Days:</span>
              <span className="text-sm font-semibold text-emerald-400">{summaryStats.winningDays}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Loss Days:</span>
              <span className="text-sm font-semibold text-red-400">{summaryStats.losingDays}</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--theme-primary))]" />
          </div>
        )}

        {/* Main content area */}
        {!loading && (
          <div className="flex gap-6">
            {/* Left column - Day list */}
            <div className="flex-1 min-w-0 space-y-4">
              {hasTrades ? (
                <>
                  {/* Expand/Collapse controls */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-muted)]">
                      {filteredDays.length} trading day{filteredDays.length !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={expandAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-white transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        Expand all
                      </button>
                      <button
                        onClick={collapseAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-white transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        Collapse all
                      </button>
                    </div>
                  </div>

                  {/* Day accordions */}
                  <div className="space-y-3">
                    {filteredDays.map((day) => (
                      <div
                        key={day.date}
                        ref={(el) => {
                          if (el) dayRefs.current.set(day.date, el)
                        }}
                      >
                        <DayAccordion
                          day={day}
                          isExpanded={expandedDays.has(day.date)}
                          onToggle={() => toggleDay(day.date)}
                          onAddNote={() => console.log("Add note for", day.date)}
                        />
                      </div>
                    ))}
                  </div>

                  {filteredDays.length === 0 && searchQuery && (
                    <GlassCard className="p-8 text-center">
                      <p className="text-[var(--text-muted)]">
                        No trades found matching &quot;{searchQuery}&quot;
                      </p>
                    </GlassCard>
                  )}
                </>
              ) : (
                /* Empty state */
                <GlassCard className="p-8">
                  <div className="text-center max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-[var(--text-muted)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {accountType === "demo" ? "No demo trades" : "No trades yet"}
                    </h3>
                    <p className="text-[var(--text-muted)] text-sm mb-6">
                      {accountType === "demo" 
                        ? "Demo account has no trades. Switch to Live Account to see your imported trades."
                        : "Import your trades or add them manually to see your trading history organized by day."
                      }
                    </p>
                    {accountType === "live" && (
                      <Button variant="glass-theme" onClick={() => setAddTradesOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Trade
                      </Button>
                    )}
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Right column - Calendar sidebar */}
            <div className="hidden lg:block w-[280px] flex-shrink-0">
              <div className="sticky top-6">
                <CalendarSidebar
                  dailyPnl={calendarDays}
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Trades Wizard */}
      <AddTradesWizard
        open={addTradesOpen}
        onClose={() => setAddTradesOpen(false)}
        onComplete={handleTradeAdded}
      />
    </PageContainer>
  )
}
