"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Switch } from "@/components/ui/switch"
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
} from "@/components/dashboard"
import { AddTradesWizard } from "@/components/add-trades"
import { useDashboardLayout } from "@/lib/hooks/useDashboardLayout"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { createClientSafe } from "@/lib/supabase/browser"
import { generateDemoTrades } from "@/lib/mockData"
import {
  calculateTradeStats,
  calculateDailyPnl,
  calculateEquityCurve,
  processDbTrades,
  buildCalendarForMonth,
  type ClosedTrade,
} from "@/lib/analytics/tradesAnalytics"

// Types
interface TradeData {
  id: string
  symbol: string
  side: string
  quantity: number
  entry_price: number
  exit_price: number
  pnl: number
  fees: number
  entry_time: string
  exit_time: string
}

interface DashboardData {
  netPnL: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  winningDays: number
  losingDays: number
  dailyPnL: Array<{ date: string; pnl: number }>
  equityCurve: Array<{ date: string; value: number }>
  recentTrades: Array<{
    id: string
    symbol: string
    side: "long" | "short"
    entryPrice: number
    exitPrice?: number
    pnl?: number
    status: "open" | "closed"
    date: string
  }>
  calendarData: Array<{ date: string; pnl: number | null }>
}

// Calculate dashboard data from trades using unified analytics
function calculateDashboardData(trades: TradeData[]): DashboardData {
  if (trades.length === 0) {
    return {
      netPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      winningDays: 0,
      losingDays: 0,
      dailyPnL: [],
      equityCurve: [],
      recentTrades: [],
      calendarData: [],
    }
  }

  // Convert TradeData to ClosedTrade format for unified analytics
  const closedTrades: ClosedTrade[] = trades
    .filter(t => t.exit_time)
    .map(t => ({
      id: t.id,
      symbol: t.symbol || 'Unknown',
      side: t.side?.toUpperCase() === 'SHORT' || t.side?.toUpperCase() === 'SELL' ? 'SHORT' as const : 'LONG' as const,
      quantity: t.quantity || 0,
      entryPrice: t.entry_price || 0,
      exitPrice: t.exit_price || 0,
      entryTime: t.entry_time || '',
      exitTime: t.exit_time,
      pnl: t.pnl || 0,
      fees: t.fees || 0,
      status: 'closed' as const,
    }))

  // Use unified analytics module
  const stats = calculateTradeStats(closedTrades, 'America/Chicago')
  const dailyPnlData = calculateDailyPnl(closedTrades, 'America/Chicago')
  const equityCurveData = calculateEquityCurve(dailyPnlData)

  // Convert daily P&L to dashboard format
  const dailyPnL = dailyPnlData.map(d => ({ date: d.date, pnl: d.netPnl }))
  
  // Convert equity curve to dashboard format
  const equityCurve = equityCurveData.map(e => ({ date: e.date, value: e.equity }))

  // Recent trades (last 10)
  const recentTrades = closedTrades
    .slice(0, 10)
    .map(t => ({
      id: t.id,
      symbol: t.symbol,
      side: (t.side === 'LONG' ? 'long' : 'short') as "long" | "short",
      entryPrice: t.entryPrice || 0,
      exitPrice: t.exitPrice,
      pnl: t.pnl || 0,
      status: 'closed' as const,
      date: t.exitTime ? new Date(t.exitTime).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '',
    }))

  // Calendar data - build from daily P&L
  const dailyPnlMap: Record<string, number> = {}
  for (const day of dailyPnlData) {
    dailyPnlMap[day.date] = day.netPnl
  }
  
  const calendarData: Array<{ date: string; pnl: number | null }> = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    calendarData.push({
      date: dateKey,
      pnl: dailyPnlMap[dateKey] ?? null
    })
  }

  return {
    netPnL: stats.netPnl,
    totalTrades: stats.totalTrades,
    winningTrades: stats.winningTrades,
    losingTrades: stats.losingTrades,
    profitFactor: stats.profitFactor,
    avgWin: stats.avgWin,
    avgLoss: stats.avgLoss,
    winningDays: stats.winningDays,
    losingDays: stats.losingDays,
    dailyPnL,
    equityCurve,
    recentTrades,
    calendarData,
  }
}

// KPI tooltips
const KPI_TOOLTIPS: Record<string, string> = {
  netPnL: "Total profit/loss in the selected period.",
  tradeWin: "Winning trades ÷ total trades taken in the selected period.",
  profitFactor: "Sum of profits from winning trades ÷ absolute sum of losses from losing trades.",
  dailyWin: "Winning days ÷ total trading days (days with at least one trade) in the selected period.",
  avgWinLoss: "Average winning trade size ÷ average losing trade size.",
}

// Build calendar data for a specific month from trades
function buildCalendarDataForMonth(trades: TradeData[], targetMonth: Date) {
  const year = targetMonth.getFullYear()
  const month = targetMonth.getMonth()
  const monthName = targetMonth.toLocaleString('default', { month: 'long' })
  
  // Get first and last day of the month
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  
  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc)
  // Adjust to make Monday = 0
  let firstDayWeekday = firstDayOfMonth.getDay() - 1
  if (firstDayWeekday < 0) firstDayWeekday = 6 // Sunday becomes 6
  
  // Group trades by date for this month
  const pnlByDate: Record<number, number> = {}
  
  trades.forEach(trade => {
    const exitDate = new Date(trade.exit_time)
    if (exitDate.getFullYear() === year && exitDate.getMonth() === month) {
      const day = exitDate.getDate()
      pnlByDate[day] = (pnlByDate[day] || 0) + trade.pnl
    }
  })
  
  // Build weeks array
  const weeks: { days: { date: number; pnl: number | null; isCurrentMonth: boolean }[]; weeklyTotal: number }[] = []
  let currentWeek: { date: number; pnl: number | null; isCurrentMonth: boolean }[] = []
  let weeklyTotal = 0
  
  // Add days from previous month to fill first week
  const prevMonth = new Date(year, month, 0) // Last day of previous month
  const prevMonthDays = prevMonth.getDate()
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    currentWeek.push({
      date: prevMonthDays - i,
      pnl: null,
      isCurrentMonth: false,
    })
  }
  
  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const pnl = pnlByDate[day] !== undefined ? Math.round(pnlByDate[day] * 100) / 100 : null
    currentWeek.push({
      date: day,
      pnl,
      isCurrentMonth: true,
    })
    
    if (pnl !== null) {
      weeklyTotal += pnl
    }
    
    // If we've completed a week (7 days)
    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek, weeklyTotal: Math.round(weeklyTotal * 100) / 100 })
      currentWeek = []
      weeklyTotal = 0
    }
  }
  
  // Add days from next month to fill last week
  if (currentWeek.length > 0) {
    let nextMonthDay = 1
    while (currentWeek.length < 7) {
      currentWeek.push({
        date: nextMonthDay++,
        pnl: null,
        isCurrentMonth: false,
      })
    }
    weeks.push({ days: currentWeek, weeklyTotal: Math.round(weeklyTotal * 100) / 100 })
  }
  
  // Calculate monthly total
  const monthlyTotal = Object.values(pnlByDate).reduce((sum, pnl) => sum + pnl, 0)
  
  return {
    month: monthName,
    year,
    weeks,
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
  }
}

export default function DashboardPage() {
  const { user } = useSupabaseAuthContext()
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [addTradesOpen, setAddTradesOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [trades, setTrades] = useState<TradeData[]>([])
  const [accountMode, setAccountMode] = useState<'live' | 'demo'>('demo')
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  
  const { 
    layout, 
    loading: layoutLoading, 
    saving,
    saveLayout, 
    resetLayout, 
    isSectionEnabled 
  } = useDashboardLayout()

  // Calendar month navigation handlers
  const handlePrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Load account mode preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-account-mode')
    if (saved === 'live' || saved === 'demo') {
      setAccountMode(saved)
    }
  }, [])

  // Save account mode preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('dashboard-account-mode', accountMode)
  }, [accountMode])

  // Fetch trades (demo or live based on account mode)
  useEffect(() => {
    async function fetchTrades() {
      // Demo mode: use generated sample data
      if (accountMode === 'demo') {
        setTrades(generateDemoTrades() as TradeData[])
        setLoading(false)
        return
      }

      // Live mode: fetch from Supabase
      if (!user) {
        setLoading(false)
        setTrades([])
        return
      }

      const supabase = createClientSafe()
      if (!supabase) {
        setLoading(false)
        return
      }

      // Fetch last 90 days of trades for live mode
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .gte('exit_time', ninetyDaysAgo.toISOString())
        .order('exit_time', { ascending: false })

      if (error) {
        console.error('Error fetching trades:', error)
      } else {
        // #region agent log
        const fetchedTrades = data || []
        const totalPnl = fetchedTrades.reduce((sum: number, t: TradeData) => sum + (t.pnl || 0), 0)
        console.log('[DASHBOARD] Fetched trades:', fetchedTrades.length, 'Total P&L:', totalPnl.toFixed(2))
        console.log('[DASHBOARD] First 3 trades:', fetchedTrades.slice(0, 3).map(t => ({
          id: t.id,
          symbol: t.symbol,
          pnl: t.pnl,
          qty: t.quantity,
          exit_time: t.exit_time
        })))
        fetch('http://127.0.0.1:7244/ingest/f9d36528-bdb9-4b04-b221-059ba99f96fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'JournalDashboardPage.tsx:fetchTrades',message:'Fetched trades from DB',data:{count:fetchedTrades.length,totalPnl,first3:fetchedTrades.slice(0,3).map((t: TradeData)=>({id:t.id,pnl:t.pnl,symbol:t.symbol,qty:t.quantity}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setTrades(fetchedTrades)
      }

      setLoading(false)
    }

    fetchTrades()
  }, [user, accountMode])

  // Calculate dashboard data
  const dashboardData = useMemo(() => {
    return calculateDashboardData(trades)
  }, [trades])

  // KPI values derived from real data
  const kpiData = useMemo(() => ({
    netPnL: {
      value: dashboardData.netPnL,
      trend: dashboardData.netPnL >= 0 ? 'up' as const : 'down' as const,
      trendValue: '',
    },
    tradeWin: {
      value: dashboardData.totalTrades > 0 
        ? Math.round((dashboardData.winningTrades / dashboardData.totalTrades) * 100)
        : 0,
      wins: dashboardData.winningTrades,
      losses: dashboardData.losingTrades,
    },
    profitFactor: {
      value: dashboardData.profitFactor,
      trend: dashboardData.profitFactor >= 1 ? 'up' as const : 'down' as const,
      trendValue: '',
    },
    dailyWin: {
      value: (dashboardData.winningDays + dashboardData.losingDays) > 0
        ? Math.round((dashboardData.winningDays / (dashboardData.winningDays + dashboardData.losingDays)) * 100)
        : 0,
      winDays: dashboardData.winningDays,
      lossDays: dashboardData.losingDays,
    },
    avgWinLoss: {
      value: dashboardData.avgLoss > 0 
        ? Math.round((dashboardData.avgWin / dashboardData.avgLoss) * 100) / 100
        : 0,
      avgWin: dashboardData.avgWin,
      avgLoss: dashboardData.avgLoss,
    },
  }), [dashboardData])

  // Nova Score calculation (simplified)
  const novaScore = useMemo(() => {
    const winRate = kpiData.tradeWin.value
    const pf = Math.min(kpiData.profitFactor.value, 3) / 3 * 100
    const avgWinLoss = Math.min(kpiData.avgWinLoss.value, 3) / 3 * 100
    const dayWinRate = kpiData.dailyWin.value
    
    const score = Math.round((winRate * 0.25 + pf * 0.25 + avgWinLoss * 0.25 + dayWinRate * 0.25))
    
    return {
      score: Math.min(score, 100),
      data: [
        { subject: "Win %", value: winRate, fullMark: 100 },
        { subject: "Profit Factor", value: pf, fullMark: 100 },
        { subject: "Avg Win/Loss", value: avgWinLoss, fullMark: 100 },
        { subject: "Day Win %", value: dayWinRate, fullMark: 100 },
        { subject: "Consistency", value: Math.min(dashboardData.totalTrades * 2, 100), fullMark: 100 },
        { subject: "Risk Mgmt", value: 70, fullMark: 100 },
      ]
    }
  }, [kpiData, dashboardData])

  // Week progress for tracker (7 days with day names for ProgressTrackerCard)
  const weekProgressForTracker = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    
    const days: { day: string; score: number | null }[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + d)
      const dateKey = date.toISOString().split('T')[0]
      const dayPnl = dashboardData.dailyPnL.find(dp => dp.date === dateKey)
      // Convert P&L to a score (positive = good score, negative = bad score)
      let score: number | null = null
      if (dayPnl?.pnl !== undefined) {
        // Simple scoring: positive P&L gets higher score
        score = dayPnl.pnl > 0 ? Math.min(100, 60 + (dayPnl.pnl / 10)) : 
                dayPnl.pnl < 0 ? Math.max(0, 40 + (dayPnl.pnl / 10)) : 50
      }
      days.push({
        day: dayNames[d],
        score
      })
    }
    
    return days
  }, [dashboardData.dailyPnL])

  // Week progress for calendar (4 weeks with nested days structure)
  const weekProgressForCalendar = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    
    const weeks = []
    for (let w = 0; w < 4; w++) {
      const weekStart = new Date(startOfWeek)
      weekStart.setDate(startOfWeek.getDate() - (w * 7))
      
      const days = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + d)
        const dateKey = date.toISOString().split('T')[0]
        const dayPnl = dashboardData.dailyPnL.find(dp => dp.date === dateKey)
        days.push({
          date: date.getDate(),
          pnl: dayPnl?.pnl ?? null
        })
      }
      
      weeks.push({
        days,
        weekTotal: days.reduce((sum, d) => sum + (d.pnl || 0), 0)
      })
    }
    
    return weeks.reverse()
  }, [dashboardData.dailyPnL])

  // Render KPI based on id
  function renderKPI(kpiId: string) {
    switch (kpiId) {
      case "netPnL":
        return (
          <KPICard
            key="netPnL"
            title="Net P&L"
            tooltip={KPI_TOOLTIPS.netPnL}
            value={`${kpiData.netPnL.value >= 0 ? '+' : ''}$${kpiData.netPnL.value.toLocaleString()}`}
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

  if (loading || layoutLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-[var(--text-muted)]">Loading dashboard...</div>
      </div>
    )
  }

  const hasTrades = trades.length > 0

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Dashboard" 
        subtitle={hasTrades 
          ? `${dashboardData.totalTrades} trades in the last 30 days`
          : "Welcome back! Import trades to see your performance."
        }
        actions={
          <div className="flex items-center gap-3">
            {/* Demo/Live Account Toggle */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5 border border-white/10">
              <span className={`text-xs font-medium transition-colors ${accountMode === 'demo' ? 'text-[hsl(var(--theme-primary))]' : 'text-white/50'}`}>
                Demo
              </span>
              <Switch 
                checked={accountMode === 'live'} 
                onCheckedChange={(checked) => setAccountMode(checked ? 'live' : 'demo')}
                className="data-[state=checked]:bg-[hsl(var(--theme-primary))]"
              />
              <span className={`text-xs font-medium transition-colors ${accountMode === 'live' ? 'text-[hsl(var(--theme-primary))]' : 'text-white/50'}`}>
                Live
              </span>
            </div>
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

      {!hasTrades ? (
        /* Empty state */
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--theme-primary))]/10 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-[hsl(var(--theme-primary))]" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No trades yet</h3>
          <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            Import your trading history to see performance metrics, charts, and insights.
          </p>
          <Button variant="glass-theme" onClick={() => setAddTradesOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Trade
          </Button>
        </div>
      ) : (
        <>
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
                  score={novaScore.score} 
                  data={novaScore.data} 
                />
              )}
              {isSectionEnabled("progressTracker") && (
                <ProgressTrackerCard
                  weekData={weekProgressForTracker}
                  todayScore={kpiData.dailyWin.value}
                  onChecklistClick={() => console.log("Open checklist")}
                />
              )}
              {isSectionEnabled("equityCurve") && (
                <ChartCard title="Daily Net Cumulative P&L" subtitle="Equity curve">
                  <div className="h-[180px]">
                    {dashboardData.equityCurve.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.equityCurve}>
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
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                            formatter={(value?: number) => [`$${(value ?? 0).toLocaleString()}`, 'Balance']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
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
                    ) : (
                      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                        No data available
                      </div>
                    )}
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
                    {dashboardData.dailyPnL.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.dailyPnL}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            tickLine={false}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                            formatter={(value?: number) => [`$${value ?? 0}`, 'P&L']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                            {dashboardData.dailyPnL.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                        No data available
                      </div>
                    )}
                  </div>
                </ChartCard>
              )}

              {isSectionEnabled("recentTrades") && (
                <RecentTradesTable 
                  trades={dashboardData.recentTrades.length > 0 
                    ? dashboardData.recentTrades 
                    : []
                  } 
                  className="lg:col-span-1" 
                />
              )}

              {isSectionEnabled("accountBalance") && (
                <ChartCard title="Account Balance" subtitle="With deposits/withdrawals" icon={<DollarSign className="w-4 h-4" />}>
                  <div className="h-[220px]">
                    {dashboardData.equityCurve.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboardData.equityCurve}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            tickLine={false}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                            formatter={(value?: number) => [`$${(value ?? 0).toLocaleString()}`, 'Balance']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="var(--theme-gradient-from)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                        No data available
                      </div>
                    )}
                  </div>
                </ChartCard>
              )}
            </div>
          )}

          {/* Calendar P&L */}
          {isSectionEnabled("calendar") && (() => {
            // Build calendar data for the selected month
            const calendarData = buildCalendarDataForMonth(trades, calendarMonth)
            
            return (
              <CalendarPnLView 
                month={calendarData.month}
                year={calendarData.year}
                weeks={calendarData.weeks}
                monthlyTotal={calendarData.monthlyTotal}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
              />
            )
          })()}
        </>
      )}

      {/* Customize Drawer */}
      <CustomizeDashboardDrawer
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        layout={layout}
        onSave={async (newLayout) => {
          return await saveLayout(newLayout)
        }}
        onReset={resetLayout}
        saving={saving}
      />

      {/* Add Trades Wizard */}
      <AddTradesWizard
        open={addTradesOpen}
        onClose={() => setAddTradesOpen(false)}
        onComplete={() => {
          // Refresh the page to get new data
          window.location.reload()
        }}
      />
    </div>
  )
}
