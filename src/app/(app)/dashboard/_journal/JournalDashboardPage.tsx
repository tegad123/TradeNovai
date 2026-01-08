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

// Calculate dashboard data from trades
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

  // Basic stats
  const winningTrades = trades.filter(t => t.pnl > 0)
  const losingTrades = trades.filter(t => t.pnl <= 0)
  
  const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0)
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0))
  
  const netPnL = trades.reduce((sum, t) => sum + t.pnl - (t.fees || 0), 0)
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0
  
  const avgWin = winningTrades.length > 0 
    ? totalWins / winningTrades.length 
    : 0
  const avgLoss = losingTrades.length > 0 
    ? totalLosses / losingTrades.length 
    : 0

  // Group by day for daily P&L and calendar
  const tradesByDay: Record<string, number> = {}
  trades.forEach(trade => {
    if (!trade.exit_time) return // Skip trades without exit_time
    const dateKey = new Date(trade.exit_time).toISOString().split('T')[0]
    tradesByDay[dateKey] = (tradesByDay[dateKey] || 0) + (trade.pnl || 0) - (trade.fees || 0)
  })

  const dailyPnL = Object.entries(tradesByDay)
    .map(([date, pnl]) => ({ date, pnl: Math.round(pnl * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Calculate winning/losing days
  const winningDays = dailyPnL.filter(d => d.pnl > 0).length
  const losingDays = dailyPnL.filter(d => d.pnl < 0).length

  // Equity curve (cumulative P&L)
  let cumulative = 0
  const equityCurve = dailyPnL.map(day => {
    cumulative += day.pnl
    return { date: day.date, value: Math.round(cumulative * 100) / 100 }
  })

  // Recent trades (last 10)
  const recentTrades = trades
    .filter(t => t.exit_time) // Only include trades with exit_time
    .slice(0, 10)
    .map(t => ({
      id: t.id,
      symbol: t.symbol,
      side: (t.side === 'long' || t.side === 'short' ? t.side : 'long') as "long" | "short",
      entryPrice: t.entry_price || 0,
      exitPrice: t.exit_price,
      pnl: t.pnl || 0,
      status: 'closed' as const,
      date: t.exit_time ? new Date(t.exit_time).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '',
    }))

  // Calendar data (last 30 days)
  const calendarData: Array<{ date: string; pnl: number | null }> = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    calendarData.push({
      date: dateKey,
      pnl: tradesByDay[dateKey] ?? null
    })
  }

  return {
    netPnL: Math.round(netPnL * 100) / 100,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    profitFactor: isFinite(profitFactor) ? Math.round(profitFactor * 100) / 100 : 0,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    winningDays,
    losingDays,
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

export default function DashboardPage() {
  const { user } = useSupabaseAuthContext()
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [addTradesOpen, setAddTradesOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [trades, setTrades] = useState<TradeData[]>([])
  
  const { 
    layout, 
    loading: layoutLoading, 
    saving,
    saveLayout, 
    resetLayout, 
    isSectionEnabled 
  } = useDashboardLayout()

  // Fetch trades
  useEffect(() => {
    async function fetchTrades() {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard:fetchTrades:entry',message:'fetchTrades called',data:{hasUser:!!user,userId:user?.id?.slice(-6)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2'})}).catch(()=>{});
      // #endregion

      if (!user) {
        setLoading(false)
        setTrades([])
        return
      }

      const supabase = createClientSafe()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard:fetchTrades:supabase',message:'Supabase client check',data:{hasSupabase:!!supabase},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      if (!supabase) {
        setLoading(false)
        return
      }

      // Fetch last 30 days of trades
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard:fetchTrades:beforeQuery',message:'About to query trades',data:{userId:user.id.slice(-6),fromDate:thirtyDaysAgo.toISOString().split('T')[0]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3,H4'})}).catch(()=>{});
      // #endregion

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .gte('exit_time', thirtyDaysAgo.toISOString())
        .order('exit_time', { ascending: false })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard:fetchTrades:afterQuery',message:'Query result',data:{hasError:!!error,errorMessage:error?.message,tradesCount:data?.length||0,firstTradeId:data?.[0]?.id?.slice(-6)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3,H4'})}).catch(()=>{});
      // #endregion

      if (error) {
        console.error('Error fetching trades:', error)
      } else {
        setTrades(data || [])
      }

      setLoading(false)
    }

    fetchTrades()
  }, [user])

  // Calculate dashboard data
  const dashboardData = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard:calculateData:entry',message:'About to calculate dashboard data',data:{tradesCount:trades.length,firstTrade:trades[0]?{id:trades[0].id?.slice(-6),pnl:trades[0].pnl,exit_time:trades[0].exit_time,fees:trades[0].fees}:null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{});
    // #endregion
    try {
      const result = calculateDashboardData(trades)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard:calculateData:success',message:'Dashboard data calculated',data:{netPnL:result.netPnL,totalTrades:result.totalTrades,dailyPnLCount:result.dailyPnL.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      return result
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard:calculateData:error',message:'Error calculating dashboard data',data:{error:String(err)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      throw err
    }
  }, [trades])

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard:render:afterDashboardData',message:'dashboardData available',data:{netPnL:dashboardData.netPnL,totalTrades:dashboardData.totalTrades},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H7'})}).catch(()=>{});
  // #endregion

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
          <div className="flex items-center gap-2">
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
            // Build calendar data for CalendarPnLView
            const today = new Date()
            const currentMonth = today.toLocaleString('default', { month: 'long' })
            const currentYear = today.getFullYear()
            
            // Convert weekProgressForCalendar to CalendarPnLView format
            const calendarWeeks = weekProgressForCalendar.map(week => ({
              days: week.days.map((day, idx) => ({
                date: day.date || (idx + 1),
                pnl: day.pnl,
                isCurrentMonth: true,
              })),
              weeklyTotal: week.weekTotal || 0,
            }))
            
            const monthlyTotal = calendarWeeks.reduce((sum, week) => sum + week.weeklyTotal, 0)
            
            return (
              <CalendarPnLView 
                month={currentMonth}
                year={currentYear}
                weeks={calendarWeeks}
                monthlyTotal={monthlyTotal}
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
