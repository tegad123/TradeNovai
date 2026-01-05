"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  DollarSign, 
  TrendingUp, 
  Settings2,
  Plus
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"

import { PageHeader } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { 
  KPICard, 
  ChartCard, 
  NovaScoreCard, 
  ProgressTrackerCard,
  RecentTradesTable,
  CalendarPnLView,
  WinLossRatioCard,
  MeterKPICard,
  CustomizeDashboardDrawer,
  DateRangePicker,
} from "@/components/dashboard"
import { AddTradesWizard } from "@/components/add-trades"
import { useDashboardLayout } from "@/lib/hooks/useDashboardLayout"
import { useTrades } from "@/lib/hooks/useTrades"
import {
  getTradeDateRange,
  filterTradesByRange,
  computeKPIStats,
  computeDailyStats,
  computeEquityCurve,
  computeDailyPnL,
  computeCalendarData,
  computeDrawdown,
  computeTradeTimePerformance,
  computeTradeDurationPerformance,
} from "@/lib/contexts/DashboardDateRangeContext"

import {
  mockNovaScore,
  mockWeekProgress,
} from "@/lib/mockData"

// KPI tooltips
const KPI_TOOLTIPS: Record<string, string> = {
  netPnL: "Total profit/loss in the selected period.",
  tradeWin: "Winning trades ÷ total trades taken in the selected period.",
  profitFactor: "Sum of profits from winning trades ÷ absolute sum of losses from losing trades.",
  dailyWin: "Winning days ÷ total trading days (days with at least one trade) in the selected period.",
  avgWinLoss: "Average winning trade size ÷ average losing trade size.",
}

export default function DashboardPage() {
  const router = useRouter()
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [addTradesOpen, setAddTradesOpen] = useState(false)
  const { 
    layout, 
    loading, 
    saving,
    saveLayout, 
    resetLayout, 
    isSectionEnabled 
  } = useDashboardLayout()

  // Load trades data
  const { trades, loading: tradesLoading, refresh: refreshTrades } = useTrades()

  // Compute the data-derived date range (min/max of all trades)
  const dataRange = useMemo(() => {
    return getTradeDateRange(trades)
  }, [trades])

  // User-selectable date range (defaults to data range or fallback)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)

  // Initialize/update date range when data range changes
  const activeDateRange = useMemo(() => {
    // If user has set a custom range, use it
    if (dateRange) {
      return dateRange
    }
    // Otherwise use the data-derived range
    if (dataRange) {
      return dataRange
    }
    // Fallback to current month if no trades
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    return { start: startOfMonth, end: endOfToday }
  }, [dateRange, dataRange])

  // Handle date range change from the picker
  const handleDateRangeChange = (newRange: { start: Date; end: Date }) => {
    setDateRange(newRange)
  }

  // Filter trades to the active date range
  const filteredTrades = useMemo(() => {
    return filterTradesByRange(trades, activeDateRange)
  }, [trades, activeDateRange])

  // Compute all stats from filtered trades
  const kpiStats = useMemo(() => computeKPIStats(filteredTrades), [filteredTrades])
  const dailyStats = useMemo(() => computeDailyStats(filteredTrades), [filteredTrades])
  const equityCurve = useMemo(() => computeEquityCurve(filteredTrades), [filteredTrades])
  const dailyPnL = useMemo(() => computeDailyPnL(filteredTrades), [filteredTrades])
  const drawdownData = useMemo(() => computeDrawdown(filteredTrades), [filteredTrades])
  const tradeTimeData = useMemo(() => computeTradeTimePerformance(filteredTrades), [filteredTrades])
  const tradeDurationData = useMemo(() => computeTradeDurationPerformance(filteredTrades), [filteredTrades])

  // Calendar month/year state - initialize to the end of the date range
  const [calendarViewDate, setCalendarViewDate] = useState<{ month: number; year: number } | null>(null)

  // Get the actual calendar month/year (user-selected or default to date range end)
  const calendarMonth = calendarViewDate?.month ?? activeDateRange.end.getMonth()
  const calendarYear = calendarViewDate?.year ?? activeDateRange.end.getFullYear()

  // Reset calendar view when date range changes significantly
  const dateRangeKey = `${activeDateRange.start.getTime()}-${activeDateRange.end.getTime()}`
  useMemo(() => {
    // Reset to the end of the new date range when range changes
    setCalendarViewDate(null)
  }, [dateRangeKey])

  const calendarData = useMemo(() => {
    // Use ALL trades for calendar (not just filtered) so we can see all months
    return computeCalendarData(trades, calendarYear, calendarMonth)
  }, [trades, calendarYear, calendarMonth])

  // Calendar navigation handlers
  const handlePrevMonth = () => {
    let newMonth = calendarMonth - 1
    let newYear = calendarYear
    if (newMonth < 0) {
      newMonth = 11
      newYear -= 1
    }
    setCalendarViewDate({ month: newMonth, year: newYear })
  }

  const handleNextMonth = () => {
    let newMonth = calendarMonth + 1
    let newYear = calendarYear
    if (newMonth > 11) {
      newMonth = 0
      newYear += 1
    }
    setCalendarViewDate({ month: newMonth, year: newYear })
  }

  // Format KPI data
  const kpiData = useMemo(() => {
    return {
      netPnL: { 
        value: kpiStats.netPnl, 
        trend: kpiStats.netPnl >= 0 ? "up" as const : "down" as const, 
        trendValue: `$${Math.abs(kpiStats.netPnl).toLocaleString()}` 
      },
      tradeWin: { 
        value: kpiStats.tradeWinRate, 
        wins: kpiStats.winningTrades, 
        losses: kpiStats.losingTrades 
      },
      profitFactor: { 
        value: kpiStats.profitFactor, 
        trend: kpiStats.profitFactor >= 1 ? "up" as const : "down" as const, 
        trendValue: kpiStats.profitFactor.toFixed(2) 
      },
      dailyWin: { 
        value: kpiStats.dailyWinRate, 
        winDays: kpiStats.winningDays, 
        lossDays: kpiStats.losingDays 
      },
      avgWinLoss: { 
        value: kpiStats.avgWinLossRatio, 
        avgWin: kpiStats.avgWin, 
        avgLoss: kpiStats.avgLoss 
      },
    }
  }, [kpiStats])

  // Compute chart data
  const chartData = useMemo(() => {
    // Equity curve
    const equityCurveChart = equityCurve.map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: point.cumulativePnl,
    }))

    // Daily P&L bars
    const dailyPnLChart = dailyPnL.map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pnl: point.pnl,
    }))

    // Account balance (cumulative)
    let balance = 10000 // Starting balance
    const accountBalance = dailyStats.map((day) => {
      balance += day.netPnl
      return {
        date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        balance,
        deposits: 0,
        withdrawals: 0,
      }
    })

    // Drawdown chart
    const drawdownChart = drawdownData.map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      drawdown: point.drawdown,
    }))

    // Trade time scatter
    const tradeTimeChart = tradeTimeData.map((point) => ({
      hour: point.hour,
      pnl: point.pnl,
      symbol: point.symbol,
    }))

    // Trade duration performance - group by duration buckets
    const durationBuckets: Record<string, { totalPnl: number; count: number }> = {
      "< 1m": { totalPnl: 0, count: 0 },
      "1-5m": { totalPnl: 0, count: 0 },
      "5-15m": { totalPnl: 0, count: 0 },
      "15-30m": { totalPnl: 0, count: 0 },
      "30m-1h": { totalPnl: 0, count: 0 },
      "1h+": { totalPnl: 0, count: 0 },
    }
    
    for (const point of tradeDurationData) {
      const mins = point.duration
      let bucket: string
      if (mins < 1) bucket = "< 1m"
      else if (mins < 5) bucket = "1-5m"
      else if (mins < 15) bucket = "5-15m"
      else if (mins < 30) bucket = "15-30m"
      else if (mins < 60) bucket = "30m-1h"
      else bucket = "1h+"
      
      durationBuckets[bucket].totalPnl += point.pnl
      durationBuckets[bucket].count++
    }

    const tradeDurationChart = Object.entries(durationBuckets).map(([duration, data]) => ({
      duration,
      pnl: data.count > 0 ? data.totalPnl : 0,
      trades: data.count,
    }))

    // Recent trades for table
    const recentTrades = filteredTrades.slice(0, 10).map((t) => ({
      id: t.id,
      symbol: t.symbol,
      side: t.side.toLowerCase() as "long" | "short",
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      pnl: t.pnl || 0,
      status: t.status as "open" | "closed",
      date: new Date(t.exitTime || t.entryTime).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }))

    // Calendar formatting
    const monthName = new Date(calendarYear, calendarMonth).toLocaleDateString("en-US", { month: "long" })
    const monthlyTotal = calendarData.weeks.reduce((sum, week) => sum + week.weekTotal, 0)

    return {
      equityCurve: equityCurveChart,
      dailyPnL: dailyPnLChart,
      accountBalance,
      drawdown: drawdownChart,
      tradeTime: tradeTimeChart,
      tradeDuration: tradeDurationChart,
      recentTrades,
      calendar: {
        month: monthName,
        year: calendarYear,
        weeks: calendarData.weeks.map((week) => ({
          days: week.days.map((day) => ({
            date: day.date,
            pnl: day.pnl,
            isCurrentMonth: day.isCurrentMonth,
          })),
          weeklyTotal: week.weekTotal,
        })),
        monthlyTotal,
      },
    }
  }, [equityCurve, dailyPnL, dailyStats, drawdownData, tradeTimeData, tradeDurationData, filteredTrades, calendarData, calendarYear, calendarMonth])

  // KPI renderer function
  function renderKPI(kpiId: string) {
    switch (kpiId) {
      case "netPnL":
        return (
          <KPICard
            key="netPnL"
            title="Net P&L"
            tooltip={KPI_TOOLTIPS.netPnL}
            value={`$${kpiData.netPnL.value.toLocaleString()}`}
            trend={kpiData.netPnL.trend}
            trendValue={kpiData.netPnL.trendValue}
            icon={<DollarSign className="w-5 h-5 text-[hsl(var(--theme-primary))]" />}
          />
        )
      case "tradeWin":
        return (
          <MeterKPICard
            key="tradeWin"
            title="Trade Win %"
            tooltip={KPI_TOOLTIPS.tradeWin}
            value={kpiData.tradeWin.value}
            wins={kpiData.tradeWin.wins}
            losses={kpiData.tradeWin.losses}
          />
        )
      case "profitFactor":
        return (
          <KPICard
            key="profitFactor"
            title="Profit Factor"
            tooltip={KPI_TOOLTIPS.profitFactor}
            value={kpiData.profitFactor.value.toFixed(2)}
            trend={kpiData.profitFactor.trend}
            trendValue={kpiData.profitFactor.trendValue}
            icon={<TrendingUp className="w-5 h-5 text-[hsl(var(--theme-primary))]" />}
          />
        )
      case "dailyWin":
        return (
          <MeterKPICard
            key="dailyWin"
            title="Daily Win %"
            tooltip={KPI_TOOLTIPS.dailyWin}
            value={kpiData.dailyWin.value}
            wins={kpiData.dailyWin.winDays}
            losses={kpiData.dailyWin.lossDays}
          />
        )
      case "avgWinLoss":
        return (
          <WinLossRatioCard
            key="avgWinLoss"
            ratio={kpiData.avgWinLoss.value}
            avgWin={kpiData.avgWinLoss.avgWin}
            avgLoss={kpiData.avgWinLoss.avgLoss}
          />
        )
      default:
        return null
    }
  }

  if (loading || tradesLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-[var(--text-muted)]">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Dashboard" 
        subtitle={`Showing ${filteredTrades.length} trades from ${activeDateRange.start.toLocaleDateString()} to ${activeDateRange.end.toLocaleDateString()}`}
        actions={
          <div className="flex items-center gap-2">
            <DateRangePicker
              range={activeDateRange}
              dataRange={dataRange}
              onRangeChange={handleDateRangeChange}
            />
            <Button 
              variant="glass-theme" 
              size="sm"
              onClick={() => setAddTradesOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Trades
            </Button>
            <Button 
              variant="glass" 
              size="sm"
              onClick={() => setCustomizeOpen(true)}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Customize
            </Button>
          </div>
        }
      />

      {/* KPI Row */}
      {isSectionEnabled("kpiRow") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {layout.kpis.map(kpiId => renderKPI(kpiId))}
        </div>
      )}

      {/* Row 2 - Nova Score, Progress Tracker, Equity Curve */}
      {(isSectionEnabled("novaScore") || isSectionEnabled("progressTracker") || isSectionEnabled("equityCurve")) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {isSectionEnabled("novaScore") && (
            <NovaScoreCard 
              score={mockNovaScore.score} 
              data={mockNovaScore.data} 
            />
          )}
          {isSectionEnabled("progressTracker") && (
            <ProgressTrackerCard
              weekData={mockWeekProgress}
              todayScore={75}
              onChecklistClick={() => console.log("Open checklist")}
            />
          )}
          {isSectionEnabled("equityCurve") && (
            <ChartCard title="Daily Net Cumulative P&L" subtitle="Equity curve">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.equityCurve.length > 0 ? chartData.equityCurve : [{ date: "No data", value: 0 }]}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--theme-gradient-from)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--theme-gradient-from)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      tickFormatter={(value) => `$${value >= 1000 || value <= -1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value) => [`$${(value ?? 0).toLocaleString()}`, 'Cumulative P&L']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="var(--theme-gradient-from)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}
        </div>
      )}

      {/* Row 3 - Daily P&L Bar, Recent Trades, Account Balance */}
      {(isSectionEnabled("dailyPnL") || isSectionEnabled("recentTrades") || isSectionEnabled("accountBalance")) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {isSectionEnabled("dailyPnL") && (
            <ChartCard title="Net Daily P&L" subtitle="Daily returns" className="lg:col-span-1">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.dailyPnL.length > 0 ? chartData.dailyPnL : [{ date: "No data", pnl: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value) => [`$${value ?? 0}`, 'P&L']}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {(chartData.dailyPnL.length > 0 ? chartData.dailyPnL : [{ date: "No data", pnl: 0 }]).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {isSectionEnabled("recentTrades") && (
            <RecentTradesTable trades={chartData.recentTrades} className="lg:col-span-1" />
          )}

          {isSectionEnabled("accountBalance") && (
            <ChartCard title="Account Balance" subtitle="With deposits/withdrawals">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.accountBalance.length > 0 ? chartData.accountBalance : [{ date: "No data", balance: 10000, deposits: 0, withdrawals: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="var(--theme-gradient-from)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--theme-gradient-from)', strokeWidth: 0, r: 3 }}
                    />
                    <Bar dataKey="deposits" fill="#10b981" />
                    <Bar dataKey="withdrawals" fill="#ef4444" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}
        </div>
      )}

      {/* Row 4 - Monthly Calendar P&L */}
      {isSectionEnabled("calendar") && (
        <CalendarPnLView
          month={chartData.calendar.month}
          year={chartData.calendar.year}
          weeks={chartData.calendar.weeks}
          monthlyTotal={chartData.calendar.monthlyTotal}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
      )}

      {/* Row 5 - Drawdown, Trade Time, Trade Duration */}
      {(isSectionEnabled("drawdown") || isSectionEnabled("tradeTime") || isSectionEnabled("tradeDuration")) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {isSectionEnabled("drawdown") && (
            <ChartCard 
              title="Drawdown" 
              subtitle="Maximum drawdown over time"
            >
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.drawdown.length > 0 ? chartData.drawdown : [{ date: "No data", drawdown: 0 }]}>
                    <defs>
                      <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value) => [`${(value ?? 0).toFixed(2)}%`, 'Drawdown']}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                    <Area 
                      type="monotone" 
                      dataKey="drawdown" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorDrawdown)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {isSectionEnabled("tradeTime") && (
            <ChartCard 
              title="Trade Time Performance" 
              subtitle="P&L by hour of day"
            >
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      type="number"
                      dataKey="hour" 
                      name="Hour"
                      domain={[0, 24]}
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      tickFormatter={(value) => `${value}:00`}
                    />
                    <YAxis 
                      type="number"
                      dataKey="pnl"
                      name="P&L"
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value, name) => {
                        if (name === 'P&L' || name === 'pnl') return [`$${value ?? 0}`, 'P&L']
                        return [value ?? 0, name]
                      }}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                    <Scatter 
                      name="Trades" 
                      data={chartData.tradeTime.length > 0 ? chartData.tradeTime : [{ hour: 12, pnl: 0 }]} 
                      fill="var(--theme-gradient-from)"
                    >
                      {(chartData.tradeTime.length > 0 ? chartData.tradeTime : [{ hour: 12, pnl: 0 }]).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} 
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {isSectionEnabled("tradeDuration") && (
            <ChartCard 
              title="Trade Duration Performance" 
              subtitle="P&L by trade duration"
            >
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.tradeDuration}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="duration" 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value, name) => {
                        if (name === 'pnl') return [`$${value ?? 0}`, 'P&L']
                        if (name === 'trades') return [value ?? 0, 'Trades']
                        return [value ?? 0, name]
                      }}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {chartData.tradeDuration.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}
        </div>
      )}

      {/* Customize Dashboard Drawer */}
      <CustomizeDashboardDrawer
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        layout={layout}
        onSave={saveLayout}
        onReset={resetLayout}
        saving={saving}
      />

      {/* Add Trades Wizard */}
      <AddTradesWizard
        open={addTradesOpen}
        onClose={() => setAddTradesOpen(false)}
        onComplete={() => {
          // Refresh trades data
          refreshTrades()
          router.refresh()
        }}
      />
    </div>
  )
}
