/**
 * Unified Trade Analytics Module
 * 
 * This module provides consistent calculations for all trade metrics.
 * Used by: Dashboard, Trades page, AI chat context.
 * 
 * CANONICAL RULES:
 * - A "trade" is a closed position with openedAt, closedAt, entryPrice, exitPrice, qty, side, fees, pnl
 * - Only closed trades (status === 'closed' && closedAt is not null) count for realized P&L metrics
 * - Open positions show separately and do not affect realized metrics
 */

// ============================================
// TYPES
// ============================================

export interface ClosedTrade {
  id: string
  symbol: string
  side: 'LONG' | 'SHORT' | 'long' | 'short' | 'BUY' | 'SELL'
  quantity: number
  entryPrice: number
  exitPrice: number
  entryTime: string  // ISO string
  exitTime: string   // ISO string (closedAt)
  pnl: number        // Net P&L (after fees) - stored in DB
  fees: number       // Total fees + commissions
  status: 'closed'
}

export interface TradeStats {
  // Core metrics
  netPnl: number
  grossPnl: number
  totalFees: number
  
  // Trade counts
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  
  // Rates
  tradeWinRate: number      // wins / totalTrades * 100
  profitFactor: number      // grossWins / |grossLosses|
  
  // Averages
  avgWin: number
  avgLoss: number
  avgWinLossRatio: number
  
  // Extremes
  largestWin: number
  largestLoss: number
  
  // Daily stats
  tradingDays: number
  winningDays: number
  losingDays: number
  breakEvenDays: number
  dailyWinRate: number      // winningDays / tradingDays * 100
}

export interface DailyPnL {
  date: string              // YYYY-MM-DD
  netPnl: number
  grossPnl: number
  fees: number
  tradeCount: number
  winners: number
  losers: number
  winRate: number
  profitFactor: number
}

export interface EquityPoint {
  date: string
  equity: number           // Cumulative P&L
  drawdown: number         // Current drawdown from peak
  drawdownPct: number      // Drawdown as percentage of peak
}

export interface HourlyPerformance {
  hour: number             // 0-23
  pnl: number
  tradeCount: number
  winRate: number
}

export interface SymbolStats {
  symbol: string
  pnl: number
  tradeCount: number
  winRate: number
  profitFactor: number
}

// ============================================
// CORE CALCULATIONS
// ============================================

/**
 * Normalize side to LONG/SHORT
 */
export function normalizeSide(side: string): 'LONG' | 'SHORT' {
  const s = side.toUpperCase()
  if (s === 'BUY' || s === 'LONG') return 'LONG'
  return 'SHORT'
}

/**
 * Calculate P&L for a single trade (if not stored in DB)
 * 
 * For LONG: grossPnl = (exitPrice - entryPrice) * qty
 * For SHORT: grossPnl = (entryPrice - exitPrice) * qty
 * netPnl = grossPnl - fees - commissions
 */
export function calculateTradePnl(
  side: string,
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  fees: number = 0
): { grossPnl: number; netPnl: number } {
  const normalizedSide = normalizeSide(side)
  
  let grossPnl: number
  if (normalizedSide === 'LONG') {
    grossPnl = (exitPrice - entryPrice) * quantity
  } else {
    grossPnl = (entryPrice - exitPrice) * quantity
  }
  
  const netPnl = grossPnl - fees
  
  return {
    grossPnl: Math.round(grossPnl * 100) / 100,
    netPnl: Math.round(netPnl * 100) / 100
  }
}

/**
 * Calculate comprehensive trade statistics
 */
export function calculateTradeStats(trades: ClosedTrade[], timezone: string = 'America/Chicago'): TradeStats {
  if (trades.length === 0) {
    return {
      netPnl: 0,
      grossPnl: 0,
      totalFees: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      tradeWinRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      avgWinLossRatio: 0,
      largestWin: 0,
      largestLoss: 0,
      tradingDays: 0,
      winningDays: 0,
      losingDays: 0,
      breakEvenDays: 0,
      dailyWinRate: 0,
    }
  }
  
  // Separate trades by outcome
  const winners = trades.filter(t => t.pnl > 0)
  const losers = trades.filter(t => t.pnl < 0)
  const breakEven = trades.filter(t => t.pnl === 0)
  
  // Calculate gross P&L (sum of all P&Ls before fees)
  // Since pnl in DB is already net, we add fees back to get gross
  const totalFees = trades.reduce((sum, t) => sum + (t.fees || 0), 0)
  const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
  const grossPnl = netPnl + totalFees
  
  // Win/loss sums for profit factor
  const grossWins = winners.reduce((sum, t) => sum + t.pnl, 0)
  const grossLossAbs = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0))
  
  // Profit Factor
  let profitFactor: number
  if (grossLossAbs === 0) {
    profitFactor = grossWins > 0 ? 999 : 0  // Use 999 as "infinity" for display
  } else {
    profitFactor = grossWins / grossLossAbs
  }
  
  // Averages
  const avgWin = winners.length > 0 ? grossWins / winners.length : 0
  const avgLossAbs = losers.length > 0 ? grossLossAbs / losers.length : 0
  
  // Avg Win/Loss Ratio
  let avgWinLossRatio: number
  if (avgLossAbs === 0) {
    avgWinLossRatio = avgWin > 0 ? 999 : 0
  } else {
    avgWinLossRatio = avgWin / avgLossAbs
  }
  
  // Extremes
  const largestWin = winners.length > 0 ? Math.max(...winners.map(t => t.pnl)) : 0
  const largestLoss = losers.length > 0 ? Math.min(...losers.map(t => t.pnl)) : 0
  
  // Daily statistics
  const dailyPnl = calculateDailyPnl(trades, timezone)
  const winningDays = dailyPnl.filter(d => d.netPnl > 0).length
  const losingDays = dailyPnl.filter(d => d.netPnl < 0).length
  const breakEvenDays = dailyPnl.filter(d => d.netPnl === 0).length
  const tradingDays = dailyPnl.length
  
  // Daily Win Rate
  const dailyWinRate = tradingDays > 0 ? (winningDays / tradingDays) * 100 : 0
  
  // Trade Win Rate
  const tradeWinRate = trades.length > 0 ? (winners.length / trades.length) * 100 : 0
  
  return {
    netPnl: Math.round(netPnl * 100) / 100,
    grossPnl: Math.round(grossPnl * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    totalTrades: trades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    breakEvenTrades: breakEven.length,
    tradeWinRate: Math.round(tradeWinRate * 10) / 10,
    profitFactor: Math.round(profitFactor * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLossAbs * 100) / 100,
    avgWinLossRatio: Math.round(avgWinLossRatio * 100) / 100,
    largestWin: Math.round(largestWin * 100) / 100,
    largestLoss: Math.round(largestLoss * 100) / 100,
    tradingDays,
    winningDays,
    losingDays,
    breakEvenDays,
    dailyWinRate: Math.round(dailyWinRate * 10) / 10,
  }
}

/**
 * Group trades by day and calculate daily P&L
 */
export function calculateDailyPnl(trades: ClosedTrade[], timezone: string = 'America/Chicago'): DailyPnL[] {
  if (trades.length === 0) return []
  
  // Group trades by date (using exitTime/closedAt)
  const byDate: Record<string, ClosedTrade[]> = {}
  
  for (const trade of trades) {
    if (!trade.exitTime) continue
    
    // Convert to date in specified timezone
    const dateKey = formatDateInTimezone(trade.exitTime, timezone)
    
    if (!byDate[dateKey]) {
      byDate[dateKey] = []
    }
    byDate[dateKey].push(trade)
  }
  
  // Calculate stats for each day
  const dailyStats: DailyPnL[] = []
  
  for (const [date, dayTrades] of Object.entries(byDate)) {
    const winners = dayTrades.filter(t => t.pnl > 0)
    const losers = dayTrades.filter(t => t.pnl < 0)
    
    const netPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0)
    const fees = dayTrades.reduce((sum, t) => sum + (t.fees || 0), 0)
    const grossPnl = netPnl + fees
    
    const grossWins = winners.reduce((sum, t) => sum + t.pnl, 0)
    const grossLossAbs = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0))
    
    const profitFactor = grossLossAbs > 0 ? grossWins / grossLossAbs : (grossWins > 0 ? 999 : 0)
    const winRate = dayTrades.length > 0 ? (winners.length / dayTrades.length) * 100 : 0
    
    dailyStats.push({
      date,
      netPnl: Math.round(netPnl * 100) / 100,
      grossPnl: Math.round(grossPnl * 100) / 100,
      fees: Math.round(fees * 100) / 100,
      tradeCount: dayTrades.length,
      winners: winners.length,
      losers: losers.length,
      winRate: Math.round(winRate * 10) / 10,
      profitFactor: Math.round(profitFactor * 100) / 100,
    })
  }
  
  // Sort by date ascending
  return dailyStats.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Calculate equity curve with drawdown
 */
export function calculateEquityCurve(dailyPnl: DailyPnL[]): EquityPoint[] {
  if (dailyPnl.length === 0) return []
  
  const equityCurve: EquityPoint[] = []
  let cumulative = 0
  let peak = 0
  
  for (const day of dailyPnl) {
    cumulative += day.netPnl
    peak = Math.max(peak, cumulative)
    
    const drawdown = cumulative - peak  // Will be <= 0
    const drawdownPct = peak > 0 ? (drawdown / peak) * 100 : 0
    
    equityCurve.push({
      date: day.date,
      equity: Math.round(cumulative * 100) / 100,
      drawdown: Math.round(drawdown * 100) / 100,
      drawdownPct: Math.round(drawdownPct * 10) / 10,
    })
  }
  
  return equityCurve
}

/**
 * Calculate hourly performance (time-of-day analysis)
 */
export function calculateHourlyPerformance(trades: ClosedTrade[], timezone: string = 'America/Chicago'): HourlyPerformance[] {
  if (trades.length === 0) return []
  
  const byHour: Record<number, { pnl: number; count: number; wins: number }> = {}
  
  for (const trade of trades) {
    if (!trade.entryTime) continue
    
    const hour = getHourInTimezone(trade.entryTime, timezone)
    
    if (!byHour[hour]) {
      byHour[hour] = { pnl: 0, count: 0, wins: 0 }
    }
    
    byHour[hour].pnl += trade.pnl
    byHour[hour].count += 1
    if (trade.pnl > 0) byHour[hour].wins += 1
  }
  
  return Object.entries(byHour)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      pnl: Math.round(data.pnl * 100) / 100,
      tradeCount: data.count,
      winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0,
    }))
    .sort((a, b) => a.hour - b.hour)
}

/**
 * Calculate performance by symbol
 */
export function calculateSymbolStats(trades: ClosedTrade[]): SymbolStats[] {
  if (trades.length === 0) return []
  
  const bySymbol: Record<string, { pnl: number; count: number; wins: number; losses: number }> = {}
  
  for (const trade of trades) {
    const symbol = trade.symbol || 'Unknown'
    
    if (!bySymbol[symbol]) {
      bySymbol[symbol] = { pnl: 0, count: 0, wins: 0, losses: 0 }
    }
    
    bySymbol[symbol].pnl += trade.pnl
    bySymbol[symbol].count += 1
    if (trade.pnl > 0) bySymbol[symbol].wins += 1
    if (trade.pnl < 0) bySymbol[symbol].losses += 1
  }
  
  return Object.entries(bySymbol)
    .map(([symbol, data]) => {
      const winPnl = trades.filter(t => t.symbol === symbol && t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
      const lossAbs = Math.abs(trades.filter(t => t.symbol === symbol && t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
      const profitFactor = lossAbs > 0 ? winPnl / lossAbs : (winPnl > 0 ? 999 : 0)
      
      return {
        symbol,
        pnl: Math.round(data.pnl * 100) / 100,
        tradeCount: data.count,
        winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0,
        profitFactor: Math.round(profitFactor * 100) / 100,
      }
    })
    .sort((a, b) => b.pnl - a.pnl)  // Sort by P&L descending
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format date in specified timezone as YYYY-MM-DD
 */
function formatDateInTimezone(isoString: string, timezone: string): string {
  try {
    const date = new Date(isoString)
    const formatted = date.toLocaleDateString('en-CA', { timeZone: timezone })  // en-CA gives YYYY-MM-DD
    return formatted
  } catch {
    // Fallback to simple ISO split
    return isoString.split('T')[0]
  }
}

/**
 * Get hour in specified timezone
 */
function getHourInTimezone(isoString: string, timezone: string): number {
  try {
    const date = new Date(isoString)
    const hourStr = date.toLocaleTimeString('en-US', { 
      timeZone: timezone, 
      hour: 'numeric', 
      hour12: false 
    })
    return parseInt(hourStr)
  } catch {
    // Fallback
    return new Date(isoString).getHours()
  }
}

/**
 * Convert raw DB trade to ClosedTrade format
 */
export function dbTradeToClosedTrade(row: {
  id: string
  symbol: string
  side: string
  quantity: number
  entry_price: number
  exit_price: number
  entry_time: string
  exit_time: string
  pnl: number
  fees?: number
  commissions?: number
  status: string
}): ClosedTrade | null {
  // Only process closed trades with exit time
  if (row.status !== 'closed' || !row.exit_time) {
    return null
  }
  
  return {
    id: row.id,
    symbol: row.symbol || 'Unknown',
    side: normalizeSide(row.side),
    quantity: row.quantity || 0,
    entryPrice: row.entry_price || 0,
    exitPrice: row.exit_price || 0,
    entryTime: row.entry_time || '',
    exitTime: row.exit_time,
    pnl: row.pnl || 0,
    fees: (row.fees || 0) + (row.commissions || 0),
    status: 'closed',
  }
}

/**
 * Process an array of DB trades into ClosedTrade[]
 */
export function processDbTrades(rows: Array<{
  id: string
  symbol: string
  side: string
  quantity: number
  entry_price: number
  exit_price: number
  entry_time: string
  exit_time: string
  pnl: number
  fees?: number
  commissions?: number
  status: string
}>): ClosedTrade[] {
  return rows
    .map(row => dbTradeToClosedTrade(row))
    .filter((t): t is ClosedTrade => t !== null)
}

// ============================================
// CALENDAR DATA BUILDER
// ============================================

export interface CalendarWeek {
  days: Array<{
    date: number | null  // Day of month, null for padding
    dateStr: string      // YYYY-MM-DD or ''
    pnl: number | null
    isCurrentMonth: boolean
  }>
  weeklyTotal: number
}

/**
 * Build calendar data for a specific month
 */
export function buildCalendarForMonth(
  dailyPnl: DailyPnL[],
  year: number,
  month: number  // 0-indexed
): { weeks: CalendarWeek[]; monthlyTotal: number } {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  
  // Get start day of week (0 = Sunday, adjust for Monday start)
  let startDayOfWeek = firstDay.getDay() - 1
  if (startDayOfWeek < 0) startDayOfWeek = 6
  
  // Create map of date -> pnl
  const pnlMap: Record<string, number> = {}
  for (const day of dailyPnl) {
    pnlMap[day.date] = day.netPnl
  }
  
  const weeks: CalendarWeek[] = []
  let currentWeek: CalendarWeek['days'] = []
  let weeklyTotal = 0
  let monthlyTotal = 0
  
  // Pad start of first week
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push({ date: null, dateStr: '', pnl: null, isCurrentMonth: false })
  }
  
  // Fill in days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const pnl = pnlMap[dateStr] ?? null
    
    if (pnl !== null) {
      weeklyTotal += pnl
      monthlyTotal += pnl
    }
    
    currentWeek.push({ date: day, dateStr, pnl, isCurrentMonth: true })
    
    // If week is complete (7 days), start new week
    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek, weeklyTotal: Math.round(weeklyTotal * 100) / 100 })
      currentWeek = []
      weeklyTotal = 0
    }
  }
  
  // Pad end of last week
  while (currentWeek.length > 0 && currentWeek.length < 7) {
    currentWeek.push({ date: null, dateStr: '', pnl: null, isCurrentMonth: false })
  }
  if (currentWeek.length > 0) {
    weeks.push({ days: currentWeek, weeklyTotal: Math.round(weeklyTotal * 100) / 100 })
  }
  
  return { weeks, monthlyTotal: Math.round(monthlyTotal * 100) / 100 }
}

