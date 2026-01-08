// Nova Score Calculation Utility
// Based on essential trading metrics

export interface TradeData {
  pnl: number
  date: string | Date
}

export interface NovaScoreMetrics {
  winRate: number          // Win % (0-100)
  profitFactor: number     // Gross profits / Gross losses
  avgWinLoss: number       // Avg winning trade / Avg losing trade
  recoveryFactor: number   // Net profit / Max drawdown
  maxDrawdown: number      // Largest peak to trough decline (as positive %)
  consistency: number      // Consistency score (0-100, based on return volatility)
}

export interface NovaScoreResult {
  score: number            // Overall score 0-100
  label: string            // "Excellent", "Good", "Average", "Needs Work"
  metrics: NovaScoreMetrics
  radarData: { subject: string; value: number; fullMark: number }[]
}

/**
 * Calculate Nova Score from trade data
 */
export function calculateNovaScore(trades: TradeData[]): NovaScoreResult {
  if (!trades || trades.length === 0) {
    return getEmptyScore()
  }

  const metrics = calculateMetrics(trades)
  const radarData = metricsToRadarData(metrics)
  const score = calculateOverallScore(metrics)
  
  return {
    score: Math.round(score),
    label: getScoreLabel(score),
    metrics,
    radarData
  }
}

/**
 * Calculate individual metrics from trades
 */
function calculateMetrics(trades: TradeData[]): NovaScoreMetrics {
  const winners = trades.filter(t => t.pnl > 0)
  const losers = trades.filter(t => t.pnl < 0)
  
  // Win Rate (%)
  const winRate = (winners.length / trades.length) * 100
  
  // Profit Factor
  const grossProfit = winners.reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0
  
  // Avg Win/Loss Ratio
  const avgWin = winners.length > 0 ? grossProfit / winners.length : 0
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 1
  const avgWinLoss = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 10 : 0
  
  // Calculate equity curve for drawdown and recovery factor
  const { maxDrawdown, maxDrawdownPercent, peakEquity } = calculateDrawdown(trades)
  
  // Recovery Factor (Net Profit / Max Drawdown)
  const netProfit = trades.reduce((sum, t) => sum + t.pnl, 0)
  const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : netProfit > 0 ? 10 : 0
  
  // Consistency (based on daily return volatility - lower volatility = higher consistency)
  const consistency = calculateConsistency(trades)
  
  return {
    winRate,
    profitFactor: Math.min(profitFactor, 10), // Cap at 10 for scoring
    avgWinLoss: Math.min(avgWinLoss, 10),     // Cap at 10 for scoring
    recoveryFactor: Math.min(recoveryFactor, 10), // Cap at 10 for scoring
    maxDrawdown: maxDrawdownPercent,
    consistency
  }
}

/**
 * Calculate max drawdown from trades
 */
function calculateDrawdown(trades: TradeData[]): { maxDrawdown: number; maxDrawdownPercent: number; peakEquity: number } {
  let equity = 0
  let peak = 0
  let maxDrawdown = 0
  let maxDrawdownPercent = 0
  
  for (const trade of trades) {
    equity += trade.pnl
    if (equity > peak) {
      peak = equity
    }
    const drawdown = peak - equity
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
      // Calculate as percentage of peak (avoid division by zero)
      maxDrawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0
    }
  }
  
  return { maxDrawdown, maxDrawdownPercent, peakEquity: peak }
}

/**
 * Calculate consistency score based on return volatility
 */
function calculateConsistency(trades: TradeData[]): number {
  if (trades.length < 2) return 50 // Not enough data
  
  // Group trades by day
  const dailyPnL = new Map<string, number>()
  
  for (const trade of trades) {
    const dateKey = new Date(trade.date).toISOString().split('T')[0]
    dailyPnL.set(dateKey, (dailyPnL.get(dateKey) || 0) + trade.pnl)
  }
  
  const dailyReturns = Array.from(dailyPnL.values())
  
  if (dailyReturns.length < 2) return 50
  
  // Calculate coefficient of variation (std dev / mean)
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
  const variance = dailyReturns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyReturns.length
  const stdDev = Math.sqrt(variance)
  
  // Convert to consistency score (lower volatility = higher consistency)
  // Use coefficient of variation relative to absolute mean
  const cv = Math.abs(mean) > 0 ? stdDev / Math.abs(mean) : stdDev > 0 ? 10 : 0
  
  // Transform: CV of 0 = 100% consistency, CV of 2+ = low consistency
  // Score = 100 * (1 - min(cv/2, 1))
  const consistencyScore = 100 * (1 - Math.min(cv / 2, 1))
  
  return Math.max(0, Math.min(100, consistencyScore))
}

/**
 * Convert metrics to radar chart data
 */
function metricsToRadarData(metrics: NovaScoreMetrics): { subject: string; value: number; fullMark: number }[] {
  return [
    { subject: "Win %", value: metrics.winRate, fullMark: 100 },
    { subject: "Profit factor", value: normalizeMetric(metrics.profitFactor, 3) * 100, fullMark: 100 },
    { subject: "Avg win/loss", value: normalizeMetric(metrics.avgWinLoss, 3) * 100, fullMark: 100 },
    { subject: "Recovery factor", value: normalizeMetric(metrics.recoveryFactor, 5) * 100, fullMark: 100 },
    { subject: "Max drawdown", value: invertDrawdownScore(metrics.maxDrawdown), fullMark: 100 },
    { subject: "Consistency", value: metrics.consistency, fullMark: 100 },
  ]
}

/**
 * Normalize a metric to 0-1 scale based on target value
 * e.g., profit factor of 2 with target 3 = 0.67
 */
function normalizeMetric(value: number, target: number): number {
  return Math.min(value / target, 1)
}

/**
 * Invert drawdown to score (lower drawdown = higher score)
 */
function invertDrawdownScore(drawdownPercent: number): number {
  // 0% drawdown = 100 score, 50%+ drawdown = 0 score
  return Math.max(0, 100 - (drawdownPercent * 2))
}

/**
 * Calculate overall Nova Score from metrics
 */
function calculateOverallScore(metrics: NovaScoreMetrics): number {
  // Weighted average of all metrics
  const weights = {
    winRate: 0.15,
    profitFactor: 0.20,
    avgWinLoss: 0.15,
    recoveryFactor: 0.15,
    maxDrawdown: 0.20,
    consistency: 0.15
  }
  
  const normalizedScores = {
    winRate: metrics.winRate,
    profitFactor: normalizeMetric(metrics.profitFactor, 2) * 100, // PF of 2 = 100%
    avgWinLoss: normalizeMetric(metrics.avgWinLoss, 2) * 100,     // Avg W/L of 2 = 100%
    recoveryFactor: normalizeMetric(metrics.recoveryFactor, 3) * 100, // RF of 3 = 100%
    maxDrawdown: invertDrawdownScore(metrics.maxDrawdown),
    consistency: metrics.consistency
  }
  
  const score = 
    normalizedScores.winRate * weights.winRate +
    normalizedScores.profitFactor * weights.profitFactor +
    normalizedScores.avgWinLoss * weights.avgWinLoss +
    normalizedScores.recoveryFactor * weights.recoveryFactor +
    normalizedScores.maxDrawdown * weights.maxDrawdown +
    normalizedScores.consistency * weights.consistency
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Get score label
 */
function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent"
  if (score >= 60) return "Good"
  if (score >= 40) return "Average"
  return "Needs Work"
}

/**
 * Return empty score for no data
 */
function getEmptyScore(): NovaScoreResult {
  return {
    score: 0,
    label: "No Data",
    metrics: {
      winRate: 0,
      profitFactor: 0,
      avgWinLoss: 0,
      recoveryFactor: 0,
      maxDrawdown: 0,
      consistency: 0
    },
    radarData: [
      { subject: "Win %", value: 0, fullMark: 100 },
      { subject: "Profit factor", value: 0, fullMark: 100 },
      { subject: "Avg win/loss", value: 0, fullMark: 100 },
      { subject: "Recovery factor", value: 0, fullMark: 100 },
      { subject: "Max drawdown", value: 0, fullMark: 100 },
      { subject: "Consistency", value: 0, fullMark: 100 },
    ]
  }
}

