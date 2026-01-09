// Trade Context Loader for AI Chat
// Provides comprehensive trade data context for the AI to analyze

import { SupabaseClient } from '@supabase/supabase-js'

export interface TradeContextOptions {
  startDate?: string   // ISO date
  endDate?: string     // ISO date  
  limit?: number       // Max trades to fetch (default 50)
}

export interface TradeContext {
  hasTrades: boolean
  tradeCount: number
  dateRange: { start: string; end: string }
  
  // Summary stats
  stats: {
    netPnl: number
    totalTrades: number
    winningTrades: number
    losingTrades: number
    winRate: number
    profitFactor: number
    avgWin: number
    avgLoss: number
    avgWinLossRatio: number
    largestWin: number
    largestLoss: number
    totalFees: number
  }
  
  // Daily aggregates (for patterns)
  dailyPnl: Array<{ date: string; pnl: number; trades: number; winners: number; losers: number }>
  
  // Time-of-day performance
  hourlyPerformance: Array<{ hour: number; pnl: number; count: number; winRate: number }>
  
  // Symbol breakdown
  symbolStats: Array<{ symbol: string; pnl: number; count: number; winRate: number }>
  
  // Recent trades (sample for AI)
  recentTrades: Array<{
    symbol: string
    side: string
    qty: number
    entryPrice: number
    exitPrice: number
    pnl: number
    fees: number
    date: string
    time: string
  }>
  
  // Best/worst analysis
  bestDay: { date: string; pnl: number } | null
  worstDay: { date: string; pnl: number } | null
  longestWinStreak: number
  longestLossStreak: number
  
  // Import metadata (if available)
  lastImport?: {
    timestamp: string
    tradesImported: number
    broker: string
    dateRange: string
    symbols: string[]
    totalPnl: number
  }
}

// Raw trade row from database
interface TradeRow {
  id: string
  symbol: string
  side: string
  quantity: number
  entry_price: number
  exit_price: number | null
  entry_time: string
  exit_time: string | null
  pnl: number | null
  fees: number | null
  commissions: number | null
  status: string
  broker: string | null
}

// Import job row from database
interface ImportJobRow {
  id: string
  broker: string | null
  filename: string | null
  trades_imported: number
  date_range_start: string | null
  date_range_end: string | null
  symbols: string[] | null
  total_pnl: number | null
  created_at: string
}

/**
 * Get comprehensive trade context for AI analysis
 */
export async function getTradeContext(
  supabase: SupabaseClient,
  userId: string,
  options?: TradeContextOptions
): Promise<TradeContext> {
  const limit = options?.limit || 50
  
  // Build query
  let query = supabase
    .from('trades')
    .select('id, symbol, side, quantity, entry_price, exit_price, entry_time, exit_time, pnl, fees, commissions, status, broker')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('exit_time', { ascending: false })
  
  // Apply date filters if provided
  if (options?.startDate) {
    query = query.gte('exit_time', options.startDate)
  }
  if (options?.endDate) {
    query = query.lte('exit_time', options.endDate)
  }
  
  // Fetch trades
  const { data: trades, error } = await query.limit(limit)
  
  if (error) {
    console.error('Error fetching trades for context:', error)
    return createEmptyContext()
  }
  
  if (!trades || trades.length === 0) {
    return createEmptyContext()
  }
  
  // Also fetch ALL trades for accurate stats (without limit)
  let allTradesQuery = supabase
    .from('trades')
    .select('id, symbol, side, quantity, entry_price, exit_price, entry_time, exit_time, pnl, fees, commissions, status')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('exit_time', { ascending: false })
  
  if (options?.startDate) {
    allTradesQuery = allTradesQuery.gte('exit_time', options.startDate)
  }
  if (options?.endDate) {
    allTradesQuery = allTradesQuery.lte('exit_time', options.endDate)
  }
  
  const { data: allTrades } = await allTradesQuery
  const tradesForStats = allTrades || trades
  
  // Compute statistics
  const context = computeTradeContext(tradesForStats as TradeRow[], trades as TradeRow[])
  
  // Fetch last import metadata
  const lastImport = await getLastImport(supabase, userId)
  if (lastImport) {
    context.lastImport = lastImport
  }
  
  return context
}

/**
 * Compute all trade statistics and context
 */
function computeTradeContext(allTrades: TradeRow[], recentTrades: TradeRow[]): TradeContext {
  // Basic counts
  const totalTrades = allTrades.length
  const winningTrades = allTrades.filter(t => (t.pnl || 0) > 0)
  const losingTrades = allTrades.filter(t => (t.pnl || 0) < 0)
  
  // P&L calculations
  const netPnl = allTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0))
  const totalFees = allTrades.reduce((sum, t) => sum + (t.fees || 0) + (t.commissions || 0), 0)
  
  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? 999 : 0)
  const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 999 : 0)
  
  // Find largest win/loss
  const largestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map(t => t.pnl || 0)) 
    : 0
  const largestLoss = losingTrades.length > 0 
    ? Math.min(...losingTrades.map(t => t.pnl || 0)) 
    : 0
  
  // Date range
  const dates = allTrades
    .map(t => t.exit_time)
    .filter((d): d is string => d !== null)
    .sort()
  const dateRange = {
    start: dates[0] ? dates[0].split('T')[0] : '',
    end: dates[dates.length - 1] ? dates[dates.length - 1].split('T')[0] : ''
  }
  
  // Daily P&L aggregates
  const dailyMap = new Map<string, { pnl: number; trades: number; winners: number; losers: number }>()
  for (const trade of allTrades) {
    if (!trade.exit_time) continue
    const date = trade.exit_time.split('T')[0]
    const existing = dailyMap.get(date) || { pnl: 0, trades: 0, winners: 0, losers: 0 }
    existing.pnl += trade.pnl || 0
    existing.trades += 1
    if ((trade.pnl || 0) > 0) existing.winners += 1
    if ((trade.pnl || 0) < 0) existing.losers += 1
    dailyMap.set(date, existing)
  }
  const dailyPnl = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => b.date.localeCompare(a.date))
  
  // Best/worst day
  const bestDay = dailyPnl.length > 0 
    ? dailyPnl.reduce((best, day) => day.pnl > best.pnl ? day : best)
    : null
  const worstDay = dailyPnl.length > 0 
    ? dailyPnl.reduce((worst, day) => day.pnl < worst.pnl ? day : worst)
    : null
  
  // Time-of-day performance (group by hour)
  const hourlyMap = new Map<number, { pnl: number; count: number; wins: number }>()
  for (const trade of allTrades) {
    if (!trade.entry_time) continue
    const hour = new Date(trade.entry_time).getHours()
    const existing = hourlyMap.get(hour) || { pnl: 0, count: 0, wins: 0 }
    existing.pnl += trade.pnl || 0
    existing.count += 1
    if ((trade.pnl || 0) > 0) existing.wins += 1
    hourlyMap.set(hour, existing)
  }
  const hourlyPerformance = Array.from(hourlyMap.entries())
    .map(([hour, data]) => ({ 
      hour, 
      pnl: Math.round(data.pnl * 100) / 100,
      count: data.count,
      winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0
    }))
    .sort((a, b) => a.hour - b.hour)
  
  // Symbol stats
  const symbolMap = new Map<string, { pnl: number; count: number; wins: number }>()
  for (const trade of allTrades) {
    const existing = symbolMap.get(trade.symbol) || { pnl: 0, count: 0, wins: 0 }
    existing.pnl += trade.pnl || 0
    existing.count += 1
    if ((trade.pnl || 0) > 0) existing.wins += 1
    symbolMap.set(trade.symbol, existing)
  }
  const symbolStats = Array.from(symbolMap.entries())
    .map(([symbol, data]) => ({ 
      symbol, 
      pnl: Math.round(data.pnl * 100) / 100,
      count: data.count,
      winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0
    }))
    .sort((a, b) => b.pnl - a.pnl) // Sort by P&L descending
  
  // Win/loss streaks
  const { longestWinStreak, longestLossStreak } = calculateStreaks(allTrades)
  
  // Format recent trades for display
  const formattedRecentTrades = recentTrades.slice(0, 15).map(t => ({
    symbol: t.symbol,
    side: t.side,
    qty: t.quantity,
    entryPrice: t.entry_price,
    exitPrice: t.exit_price || 0,
    pnl: Math.round((t.pnl || 0) * 100) / 100,
    fees: Math.round(((t.fees || 0) + (t.commissions || 0)) * 100) / 100,
    date: t.exit_time ? t.exit_time.split('T')[0] : '',
    time: t.exit_time ? new Date(t.exit_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''
  }))
  
  return {
    hasTrades: true,
    tradeCount: totalTrades,
    dateRange,
    stats: {
      netPnl: Math.round(netPnl * 100) / 100,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: Math.round(winRate * 10) / 10,
      profitFactor: Math.round(profitFactor * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      avgWinLossRatio: Math.round(avgWinLossRatio * 100) / 100,
      largestWin: Math.round(largestWin * 100) / 100,
      largestLoss: Math.round(largestLoss * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100
    },
    dailyPnl: dailyPnl.slice(0, 30), // Last 30 days
    hourlyPerformance,
    symbolStats: symbolStats.slice(0, 10), // Top 10 symbols
    recentTrades: formattedRecentTrades,
    bestDay: bestDay ? { date: bestDay.date, pnl: Math.round(bestDay.pnl * 100) / 100 } : null,
    worstDay: worstDay ? { date: worstDay.date, pnl: Math.round(worstDay.pnl * 100) / 100 } : null,
    longestWinStreak,
    longestLossStreak
  }
}

/**
 * Calculate win/loss streaks
 */
function calculateStreaks(trades: TradeRow[]): { longestWinStreak: number; longestLossStreak: number } {
  // Sort by exit time ascending for streak calculation
  const sorted = [...trades]
    .filter(t => t.exit_time)
    .sort((a, b) => new Date(a.exit_time!).getTime() - new Date(b.exit_time!).getTime())
  
  let longestWinStreak = 0
  let longestLossStreak = 0
  let currentWinStreak = 0
  let currentLossStreak = 0
  
  for (const trade of sorted) {
    if ((trade.pnl || 0) > 0) {
      currentWinStreak++
      currentLossStreak = 0
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak)
    } else if ((trade.pnl || 0) < 0) {
      currentLossStreak++
      currentWinStreak = 0
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak)
    }
  }
  
  return { longestWinStreak, longestLossStreak }
}

/**
 * Create empty context for users with no trades
 */
function createEmptyContext(): TradeContext {
  return {
    hasTrades: false,
    tradeCount: 0,
    dateRange: { start: '', end: '' },
    stats: {
      netPnl: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      avgWinLossRatio: 0,
      largestWin: 0,
      largestLoss: 0,
      totalFees: 0
    },
    dailyPnl: [],
    hourlyPerformance: [],
    symbolStats: [],
    recentTrades: [],
    bestDay: null,
    worstDay: null,
    longestWinStreak: 0,
    longestLossStreak: 0
  }
}

/**
 * Get last import job metadata
 */
async function getLastImport(
  supabase: SupabaseClient,
  userId: string
): Promise<TradeContext['lastImport'] | undefined> {
  try {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data) return undefined
    
    const job = data as ImportJobRow
    const dateStart = job.date_range_start ? new Date(job.date_range_start).toLocaleDateString() : ''
    const dateEnd = job.date_range_end ? new Date(job.date_range_end).toLocaleDateString() : ''
    
    return {
      timestamp: new Date(job.created_at).toLocaleString(),
      tradesImported: job.trades_imported,
      broker: job.broker || 'Unknown',
      dateRange: dateStart && dateEnd ? `${dateStart} - ${dateEnd}` : 'Unknown',
      symbols: job.symbols || [],
      totalPnl: job.total_pnl || 0
    }
  } catch {
    // Table may not exist yet
    return undefined
  }
}

/**
 * Format trade context as a string for the AI system prompt
 */
export function formatTradeContextForAI(context: TradeContext): string {
  if (!context.hasTrades) {
    return `
## User's Trade Data:
No trades found in the user's account. They should import their trading history first.

Suggest they:
1. Go to the Dashboard and click "Add Trades"
2. Upload a CSV from their broker (Tradovate, MetaTrader, etc.)
3. Or manually add trades
`
  }
  
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  let output = `
## User's Trade Data (as of ${today}):

### Summary Statistics:
- **Total Trades**: ${context.stats.totalTrades} (${context.stats.winningTrades} winners, ${context.stats.losingTrades} losers)
- **Net P&L**: $${context.stats.netPnl.toLocaleString()}
- **Win Rate**: ${context.stats.winRate}%
- **Profit Factor**: ${context.stats.profitFactor}
- **Avg Win**: $${context.stats.avgWin.toFixed(2)} | **Avg Loss**: -$${context.stats.avgLoss.toFixed(2)}
- **Win/Loss Ratio**: ${context.stats.avgWinLossRatio}
- **Largest Win**: $${context.stats.largestWin.toFixed(2)} | **Largest Loss**: $${context.stats.largestLoss.toFixed(2)}
- **Total Fees/Commissions**: $${context.stats.totalFees.toFixed(2)}
- **Date Range**: ${context.dateRange.start} to ${context.dateRange.end}
`

  // Best/worst day
  if (context.bestDay || context.worstDay) {
    output += `
### Best & Worst Days:
`
    if (context.bestDay) {
      output += `- **Best Day**: ${context.bestDay.date} (+$${context.bestDay.pnl.toFixed(2)})\n`
    }
    if (context.worstDay) {
      output += `- **Worst Day**: ${context.worstDay.date} ($${context.worstDay.pnl.toFixed(2)})\n`
    }
    output += `- **Longest Win Streak**: ${context.longestWinStreak} trades\n`
    output += `- **Longest Loss Streak**: ${context.longestLossStreak} trades\n`
  }

  // Symbol breakdown
  if (context.symbolStats.length > 0) {
    output += `
### Performance by Symbol:
`
    for (const sym of context.symbolStats.slice(0, 5)) {
      const pnlSign = sym.pnl >= 0 ? '+' : ''
      output += `- **${sym.symbol}**: ${sym.count} trades, ${pnlSign}$${sym.pnl.toFixed(2)}, ${sym.winRate}% win rate\n`
    }
  }

  // Time-of-day performance
  if (context.hourlyPerformance.length > 0) {
    const sorted = [...context.hourlyPerformance].sort((a, b) => b.pnl - a.pnl)
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]
    
    output += `
### Time-of-Day Performance:
- **Best Hour**: ${formatHour(best.hour)} (+$${best.pnl.toFixed(2)}, ${best.count} trades, ${best.winRate}% win rate)
- **Worst Hour**: ${formatHour(worst.hour)} ($${worst.pnl.toFixed(2)}, ${worst.count} trades, ${worst.winRate}% win rate)
`
  }

  // Recent trades
  if (context.recentTrades.length > 0) {
    output += `
### Last ${context.recentTrades.length} Trades:
`
    for (let i = 0; i < Math.min(10, context.recentTrades.length); i++) {
      const t = context.recentTrades[i]
      const pnlSign = t.pnl >= 0 ? '+' : ''
      output += `${i + 1}. ${t.symbol} ${t.side} | Entry: $${t.entryPrice.toFixed(2)} → Exit: $${t.exitPrice.toFixed(2)} | P&L: ${pnlSign}$${t.pnl.toFixed(2)} | ${t.date}\n`
    }
  }

  // Last import info
  if (context.lastImport) {
    output += `
### Last Import:
- **Date**: ${context.lastImport.timestamp}
- **Broker**: ${context.lastImport.broker}
- **Trades Imported**: ${context.lastImport.tradesImported}
- **Date Range**: ${context.lastImport.dateRange}
- **Symbols**: ${context.lastImport.symbols.slice(0, 5).join(', ')}${context.lastImport.symbols.length > 5 ? '...' : ''}
- **Total P&L**: $${context.lastImport.totalPnl.toFixed(2)}
`
  }

  return output
}

/**
 * Format hour for display
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

