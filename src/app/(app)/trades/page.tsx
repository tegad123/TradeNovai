"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { TimeframeOption, DayData, CalendarDay } from "@/lib/types/trades"
import { useTradesDayView } from "@/lib/hooks/useTrades"

export default function TradesPage() {
  const router = useRouter()
  const [addTradesOpen, setAddTradesOpen] = useState(false)
  const [timeframe, setTimeframe] = useState<TimeframeOption>("30D")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Get real data from database
  const { days: tradeDays, calendarData, loading, hasTrades: hasRealTrades, refresh } = useTradesDayView()
  
  // Convert to DayData format for the components
  const days: DayData[] = useMemo(() => {
    return tradeDays.map(day => ({
      date: day.date,
      dayLabel: day.dateLabel, // Use dayLabel to match DayData type
      netPnl: day.netPnl,
      grossPnl: day.grossPnl,
      commissions: day.commissions,
      volume: day.volume,
      profitFactor: day.profitFactor,
      totalTrades: day.totalTrades,
      winners: day.winners,
      losers: day.losers,
      winrate: day.winrate,
      equitySeries: day.equitySeries.map(p => ({ time: p.time, value: p.value })),
      trades: day.trades.map(t => ({
        id: t.id,
        symbol: t.symbol,
        side: t.side as "LONG" | "SHORT",
        quantity: t.quantity,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice || 0,
        entryTime: t.entryTime,
        exitTime: t.exitTime || t.entryTime,
        pnl: t.pnl || 0,
        commission: t.commissions || 0,
        fee: t.fees || 0,
        instrumentType: (t.instrumentType || "future") as "stock" | "option" | "future" | "forex" | "crypto" | "cfd",
      })),
    }))
  }, [tradeDays])

  // Build calendar data as CalendarDay[]
  const calendarDays: CalendarDay[] = useMemo(() => {
    const result: CalendarDay[] = []
    calendarData.forEach((pnl, date) => {
      result.push({
        date,
        netPnl: pnl,
        hasTrades: true,
      })
    })
    return result
  }, [calendarData])

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

  const hasTrades = hasRealTrades

  if (loading) {
    return (
      <PageContainer className="pb-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-[var(--text-muted)]">Loading trades...</div>
        </div>
      </PageContainer>
    )
  }

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
              <select className="appearance-none px-4 py-2 pr-8 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 cursor-pointer">
                <option value="demo" className="bg-gray-900">Demo Account</option>
                <option value="live" className="bg-gray-900">Live Account</option>
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
                {summaryStats.totalPnl >= 0 ? "+" : ""}${summaryStats.totalPnl.toLocaleString()}
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

        {/* Main content area */}
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
                  <h3 className="text-lg font-semibold text-white mb-2">No trades yet</h3>
                  <p className="text-[var(--text-muted)] text-sm mb-6">
                    Import your trades or add them manually to see your trading history organized by day.
                  </p>
                  <Button variant="glass-theme" onClick={() => setAddTradesOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Trade
                  </Button>
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
      </div>

      {/* Add Trades Wizard */}
      <AddTradesWizard
        open={addTradesOpen}
        onClose={() => setAddTradesOpen(false)}
        onComplete={() => {
          refresh()
          router.refresh()
        }}
      />
    </PageContainer>
  )
}
