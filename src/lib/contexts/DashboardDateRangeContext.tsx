"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react"
import { StoredTrade } from "@/lib/types/execution"

export interface DateRange {
  start: Date
  end: Date
}

export type DateRangeMode = "data" | "custom"

interface DashboardDateRangeContextType {
  range: DateRange
  setRange: (range: DateRange) => void
  mode: DateRangeMode
  setMode: (mode: DateRangeMode) => void
  // Derived from trades
  dataRange: DateRange | null // The actual min/max from trades
  hasTradeData: boolean
  // Helper to reset to data-derived range
  resetToDataRange: () => void
}

const DashboardDateRangeContext = createContext<DashboardDateRangeContextType | null>(null)

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Compute the min and max trade dates from a list of trades
 */
export function getTradeDateRange(trades: StoredTrade[]): DateRange | null {
  if (!trades || trades.length === 0) {
    return null
  }

  const closedTrades = trades.filter((t) => t.status === "closed" && t.entryTime)

  if (closedTrades.length === 0) {
    return null
  }

  let minDate: Date | null = null
  let maxDate: Date | null = null

  for (const trade of closedTrades) {
    const entryDate = new Date(trade.entryTime)
    const exitDate = trade.exitTime ? new Date(trade.exitTime) : entryDate

    if (!minDate || entryDate < minDate) {
      minDate = entryDate
    }
    if (!maxDate || exitDate > maxDate) {
      maxDate = exitDate
    }
  }

  if (!minDate || !maxDate) {
    return null
  }

  // Normalize to start/end of day
  const start = new Date(minDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(maxDate)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

/**
 * Filter trades to only those within the given date range
 */
export function filterTradesByRange(
  trades: StoredTrade[],
  range: DateRange
): StoredTrade[] {
  if (!trades || trades.length === 0) {
    return []
  }

  return trades.filter((trade) => {
    if (!trade.entryTime) return false
    const entryDate = new Date(trade.entryTime)
    return entryDate >= range.start && entryDate <= range.end
  })
}

/**
 * Get the default fallback range (start of current month to today)
 */
function getDefaultFallbackRange(): DateRange {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  return { start: startOfMonth, end: endOfToday }
}

// ============================================
// PROVIDER
// ============================================

interface DashboardDateRangeProviderProps {
  children: ReactNode
  trades: StoredTrade[]
}

export function DashboardDateRangeProvider({
  children,
  trades,
}: DashboardDateRangeProviderProps) {
  // Compute the data-derived range
  const dataRange = useMemo(() => getTradeDateRange(trades), [trades])
  const hasTradeData = dataRange !== null

  // The active range (starts as data range or fallback)
  const [range, setRange] = useState<DateRange>(() => {
    return dataRange || getDefaultFallbackRange()
  })

  const [mode, setMode] = useState<DateRangeMode>("data")

  // When trades change, update the data range and reset if in 'data' mode
  useEffect(() => {
    if (mode === "data") {
      const newDataRange = getTradeDateRange(trades)
      if (newDataRange) {
        setRange(newDataRange)
      } else {
        setRange(getDefaultFallbackRange())
      }
    }
  }, [trades, mode])

  const resetToDataRange = () => {
    setMode("data")
    const newDataRange = getTradeDateRange(trades)
    if (newDataRange) {
      setRange(newDataRange)
    } else {
      setRange(getDefaultFallbackRange())
    }
  }

  const value = useMemo(
    () => ({
      range,
      setRange: (newRange: DateRange) => {
        setMode("custom")
        setRange(newRange)
      },
      mode,
      setMode,
      dataRange,
      hasTradeData,
      resetToDataRange,
    }),
    [range, mode, dataRange, hasTradeData]
  )

  return (
    <DashboardDateRangeContext.Provider value={value}>
      {children}
    </DashboardDateRangeContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useDashboardDateRange() {
  const context = useContext(DashboardDateRangeContext)
  if (!context) {
    throw new Error(
      "useDashboardDateRange must be used within a DashboardDateRangeProvider"
    )
  }
  return context
}

// ============================================
// ADDITIONAL HELPERS
// ============================================

/**
 * Group trades by day and compute daily stats
 */
export interface DailyStats {
  date: string // YYYY-MM-DD
  dateObj: Date
  trades: StoredTrade[]
  netPnl: number
  grossPnl: number
  fees: number
  commissions: number
  winners: number
  losers: number
  totalTrades: number
  winRate: number
  profitFactor: number
}

export function computeDailyStats(trades: StoredTrade[]): DailyStats[] {
  const byDay: Record<string, StoredTrade[]> = {}

  for (const trade of trades) {
    if (!trade.exitTime || trade.status !== "closed") continue
    const date = new Date(trade.exitTime)
    const key = date.toISOString().split("T")[0]
    if (!byDay[key]) byDay[key] = []
    byDay[key].push(trade)
  }

  const dailyStats: DailyStats[] = []

  for (const [dateKey, dayTrades] of Object.entries(byDay)) {
    const winners = dayTrades.filter((t) => (t.pnl || 0) > 0)
    const losers = dayTrades.filter((t) => (t.pnl || 0) < 0)
    const totalPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const totalFees = dayTrades.reduce((sum, t) => sum + (t.fees || 0), 0)
    const totalCommissions = dayTrades.reduce((sum, t) => sum + (t.commissions || 0), 0)
    const grossPnl = totalPnl + totalFees + totalCommissions
    const totalWins = winners.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const totalLosses = Math.abs(losers.reduce((sum, t) => sum + (t.pnl || 0), 0))

    dailyStats.push({
      date: dateKey,
      dateObj: new Date(dateKey),
      trades: dayTrades,
      netPnl: totalPnl,
      grossPnl,
      fees: totalFees,
      commissions: totalCommissions,
      winners: winners.length,
      losers: losers.length,
      totalTrades: dayTrades.length,
      winRate: dayTrades.length > 0 ? (winners.length / dayTrades.length) * 100 : 0,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0,
    })
  }

  // Sort by date ascending
  dailyStats.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())

  return dailyStats
}

/**
 * Compute KPI stats from filtered trades
 */
export interface KPIStats {
  netPnl: number
  totalTrades: number
  closedTrades: number
  winningTrades: number
  losingTrades: number
  tradeWinRate: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  avgWinLossRatio: number
  // Daily stats
  tradingDays: number
  winningDays: number
  losingDays: number
  dailyWinRate: number
}

export function computeKPIStats(trades: StoredTrade[]): KPIStats {
  const closedTrades = trades.filter((t) => t.status === "closed")
  const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0)
  const losingTrades = closedTrades.filter((t) => (t.pnl || 0) < 0)

  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0))

  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0
  const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0
  const tradeWinRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0

  // Compute daily win rate
  const dailyStats = computeDailyStats(trades)
  const tradingDays = dailyStats.length
  const winningDays = dailyStats.filter((d) => d.netPnl > 0).length
  const losingDays = dailyStats.filter((d) => d.netPnl < 0).length
  const dailyWinRate = tradingDays > 0 ? (winningDays / tradingDays) * 100 : 0

  return {
    netPnl: totalPnl,
    totalTrades: trades.length,
    closedTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    tradeWinRate,
    profitFactor,
    avgWin,
    avgLoss,
    avgWinLossRatio,
    tradingDays,
    winningDays,
    losingDays,
    dailyWinRate,
  }
}

/**
 * Generate equity curve data (cumulative P&L by trade close time)
 */
export interface EquityCurvePoint {
  date: string
  time: number
  pnl: number
  cumulativePnl: number
}

export function computeEquityCurve(trades: StoredTrade[]): EquityCurvePoint[] {
  const closedTrades = trades
    .filter((t) => t.status === "closed" && t.exitTime)
    .sort((a, b) => new Date(a.exitTime!).getTime() - new Date(b.exitTime!).getTime())

  let cumulative = 0
  return closedTrades.map((trade) => {
    cumulative += trade.pnl || 0
    const exitDate = new Date(trade.exitTime!)
    return {
      date: exitDate.toISOString().split("T")[0],
      time: exitDate.getTime(),
      pnl: trade.pnl || 0,
      cumulativePnl: cumulative,
    }
  })
}

/**
 * Compute daily P&L for bar chart
 */
export interface DailyPnLPoint {
  date: string
  pnl: number
}

export function computeDailyPnL(trades: StoredTrade[]): DailyPnLPoint[] {
  const dailyStats = computeDailyStats(trades)
  return dailyStats.map((d) => ({
    date: d.date,
    pnl: d.netPnl,
  }))
}

/**
 * Compute monthly calendar data
 */
export interface CalendarDayData {
  date: number // day of month
  pnl: number | null
  isCurrentMonth: boolean
}

export interface CalendarWeekData {
  days: CalendarDayData[]
  weekTotal: number
}

export function computeCalendarData(
  trades: StoredTrade[],
  year: number,
  month: number // 0-indexed
): { weeks: CalendarWeekData[]; monthTotal: number } {
  const dailyStats = computeDailyStats(trades)
  const pnlByDate: Record<string, number> = {}

  for (const stat of dailyStats) {
    pnlByDate[stat.date] = stat.netPnl
  }

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startDay = firstDayOfMonth.getDay() // 0 = Sunday

  const weeks: CalendarWeekData[] = []
  let currentWeek: CalendarDayData[] = []
  let monthTotal = 0

  // Fill in empty days before the first day
  for (let i = 0; i < startDay; i++) {
    currentWeek.push({ date: 0, pnl: null, isCurrentMonth: false })
  }

  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const pnl = pnlByDate[dateStr] ?? null
    if (pnl !== null) {
      monthTotal += pnl
    }

    currentWeek.push({ date: day, pnl, isCurrentMonth: true })

    if (currentWeek.length === 7) {
      const weekTotal = currentWeek.reduce((sum, d) => sum + (d.pnl || 0), 0)
      weeks.push({ days: currentWeek, weekTotal })
      currentWeek = []
    }
  }

  // Fill remaining days in last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: 0, pnl: null, isCurrentMonth: false })
    }
    const weekTotal = currentWeek.reduce((sum, d) => sum + (d.pnl || 0), 0)
    weeks.push({ days: currentWeek, weekTotal })
  }

  return { weeks, monthTotal }
}

/**
 * Compute drawdown data
 */
export interface DrawdownPoint {
  date: string
  time: number
  drawdown: number
  peak: number
  equity: number
}

export function computeDrawdown(trades: StoredTrade[]): DrawdownPoint[] {
  const equityCurve = computeEquityCurve(trades)
  let peak = 0
  
  return equityCurve.map((point) => {
    if (point.cumulativePnl > peak) {
      peak = point.cumulativePnl
    }
    const drawdown = peak > 0 ? ((peak - point.cumulativePnl) / peak) * 100 : 0
    return {
      date: point.date,
      time: point.time,
      drawdown: -Math.abs(drawdown), // Negative for display
      peak,
      equity: point.cumulativePnl,
    }
  })
}

/**
 * Compute trade time performance (hour of day vs P&L)
 */
export interface TradeTimePoint {
  hour: number
  pnl: number
  symbol: string
}

export function computeTradeTimePerformance(trades: StoredTrade[]): TradeTimePoint[] {
  const closedTrades = trades.filter((t) => t.status === "closed" && t.entryTime)
  
  return closedTrades.map((trade) => {
    const entryDate = new Date(trade.entryTime)
    return {
      hour: entryDate.getHours() + entryDate.getMinutes() / 60,
      pnl: trade.pnl || 0,
      symbol: trade.symbol,
    }
  })
}

/**
 * Compute trade duration performance
 */
export interface TradeDurationPoint {
  duration: number // in minutes
  pnl: number
  symbol: string
}

export function computeTradeDurationPerformance(trades: StoredTrade[]): TradeDurationPoint[] {
  const closedTrades = trades.filter(
    (t) => t.status === "closed" && t.entryTime && t.exitTime
  )
  
  return closedTrades.map((trade) => {
    const entryDate = new Date(trade.entryTime)
    const exitDate = new Date(trade.exitTime!)
    const durationMs = exitDate.getTime() - entryDate.getTime()
    const durationMinutes = durationMs / (1000 * 60)
    
    return {
      duration: durationMinutes,
      pnl: trade.pnl || 0,
      symbol: trade.symbol,
    }
  })
}

