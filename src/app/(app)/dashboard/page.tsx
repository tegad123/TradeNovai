"use client"

import { useState } from "react"
import { 
  DollarSign, 
  TrendingUp, 
  BarChart3,
  Clock,
  Timer,
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

import {
  mockKPIs,
  mockNovaScore,
  mockWeekProgress,
  mockEquityCurve,
  mockDailyPnL,
  mockAccountBalance,
  mockTrades,
  mockDrawdown,
  mockTradeTimePerformance,
  mockTradeDurationPerformance,
  mockCalendarData,
} from "@/lib/mockData"

// KPI tooltips
const KPI_TOOLTIPS: Record<string, string> = {
  netPnL: "Total profit/loss in the selected period.",
  tradeWin: "Winning trades ÷ total trades taken in the selected period.",
  profitFactor: "Sum of profits from winning trades ÷ absolute sum of losses from losing trades.",
  dailyWin: "Winning days ÷ total trading days (days with at least one trade) in the selected period.",
  avgWinLoss: "Average winning trade size ÷ average losing trade size.",
}

// KPI renderer
function renderKPI(kpiId: string) {
  switch (kpiId) {
    case "netPnL":
      return (
        <KPICard
          key="netPnL"
          title="Net P&L"
          tooltip={KPI_TOOLTIPS.netPnL}
          value={`$${mockKPIs.netPnL.value.toLocaleString()}`}
          trend={mockKPIs.netPnL.trend}
          trendValue={mockKPIs.netPnL.trendValue}
          icon={<DollarSign className="w-5 h-5 text-[hsl(var(--theme-primary))]" />}
        />
      )
    case "tradeWin":
      return (
        <MeterKPICard
          key="tradeWin"
          title="Trade Win %"
          tooltip={KPI_TOOLTIPS.tradeWin}
          value={mockKPIs.tradeWin.value}
          wins={mockKPIs.tradeWin.wins}
          losses={mockKPIs.tradeWin.losses}
        />
      )
    case "profitFactor":
      return (
        <KPICard
          key="profitFactor"
          title="Profit Factor"
          tooltip={KPI_TOOLTIPS.profitFactor}
          value={mockKPIs.profitFactor.value.toFixed(2)}
          trend={mockKPIs.profitFactor.trend}
          trendValue={mockKPIs.profitFactor.trendValue}
          icon={<TrendingUp className="w-5 h-5 text-[hsl(var(--theme-primary))]" />}
        />
      )
    case "dailyWin":
      return (
        <MeterKPICard
          key="dailyWin"
          title="Daily Win %"
          tooltip={KPI_TOOLTIPS.dailyWin}
          value={mockKPIs.dailyWin.value}
          wins={mockKPIs.dailyWin.winDays}
          losses={mockKPIs.dailyWin.lossDays}
        />
      )
    case "avgWinLoss":
      return (
        <WinLossRatioCard
          key="avgWinLoss"
          ratio={mockKPIs.avgWinLoss.value}
          avgWin={mockKPIs.avgWinLoss.avgWin}
          avgLoss={mockKPIs.avgWinLoss.avgLoss}
        />
      )
    default:
      return null
  }
}

export default function DashboardPage() {
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

  if (loading) {
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
        subtitle="Welcome back! Here's your trading overview."
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
                  <AreaChart data={mockEquityCurve}>
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
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
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
                  <BarChart data={mockDailyPnL}>
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
                      formatter={(value: number) => [`$${value}`, 'P&L']}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {mockDailyPnL.map((entry, index) => (
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
            <RecentTradesTable trades={mockTrades} className="lg:col-span-1" />
          )}

          {isSectionEnabled("accountBalance") && (
            <ChartCard title="Account Balance" subtitle="With deposits/withdrawals">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockAccountBalance}>
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
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
          month={mockCalendarData.month}
          year={mockCalendarData.year}
          weeks={mockCalendarData.weeks}
          monthlyTotal={mockCalendarData.monthlyTotal}
        />
      )}

      {/* Row 5 - Drawdown, Trade Time, Trade Duration */}
      {(isSectionEnabled("drawdown") || isSectionEnabled("tradeTime") || isSectionEnabled("tradeDuration")) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {isSectionEnabled("drawdown") && (
            <ChartCard 
              title="Drawdown" 
              subtitle="Maximum drawdown over time"
              icon={<BarChart3 className="w-4 h-4" />}
            >
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockDrawdown}>
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
                      formatter={(value: number) => [`${value}%`, 'Drawdown']}
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
              icon={<Clock className="w-4 h-4" />}
            >
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      type="number"
                      dataKey="hour" 
                      name="Hour"
                      domain={[9, 16]}
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
                      formatter={(value: number, name: string) => {
                        if (name === 'P&L') return [`$${value}`, 'P&L']
                        if (name === 'Trades') return [value, 'Trades']
                        return [value, name]
                      }}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                    <Scatter 
                      name="Trades" 
                      data={mockTradeTimePerformance} 
                      fill="var(--theme-gradient-from)"
                    >
                      {mockTradeTimePerformance.map((entry, index) => (
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
              icon={<Timer className="w-4 h-4" />}
            >
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockTradeDurationPerformance}>
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
                      formatter={(value: number) => [`$${value}`, 'P&L']}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {mockTradeDurationPerformance.map((entry, index) => (
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
          // TODO: Refresh trades data
          console.log("Trade added successfully")
        }}
      />
    </div>
  )
}
