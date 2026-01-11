/**
 * Test harness for Trade Analytics Module
 * 
 * Run with: npx tsx src/lib/analytics/tradesAnalytics.test.ts
 */

import {
  calculateTradeStats,
  calculateDailyPnl,
  calculateEquityCurve,
  calculateHourlyPerformance,
  calculateSymbolStats,
  calculateTradePnl,
  type ClosedTrade,
} from './tradesAnalytics'

// Test data
const testTrades: ClosedTrade[] = [
  // Day 1: 3 trades, net +$300
  { id: '1', symbol: 'MGC', side: 'LONG', quantity: 1, entryPrice: 4220, exitPrice: 4230, entryTime: '2024-01-15T10:00:00Z', exitTime: '2024-01-15T10:30:00Z', pnl: 100, fees: 2, status: 'closed' },
  { id: '2', symbol: 'MGC', side: 'LONG', quantity: 2, entryPrice: 4225, exitPrice: 4235, entryTime: '2024-01-15T11:00:00Z', exitTime: '2024-01-15T11:45:00Z', pnl: 200, fees: 4, status: 'closed' },
  { id: '3', symbol: 'ES', side: 'SHORT', quantity: 1, entryPrice: 4850, exitPrice: 4860, entryTime: '2024-01-15T14:00:00Z', exitTime: '2024-01-15T14:30:00Z', pnl: -100, fees: 3, status: 'closed' },
  
  // Day 2: 2 trades, net -$50
  { id: '4', symbol: 'MGC', side: 'LONG', quantity: 1, entryPrice: 4240, exitPrice: 4235, entryTime: '2024-01-16T09:30:00Z', exitTime: '2024-01-16T10:15:00Z', pnl: -50, fees: 2, status: 'closed' },
  { id: '5', symbol: 'ES', side: 'LONG', quantity: 1, entryPrice: 4870, exitPrice: 4870, entryTime: '2024-01-16T11:00:00Z', exitTime: '2024-01-16T11:30:00Z', pnl: 0, fees: 3, status: 'closed' }, // Breakeven
  
  // Day 3: 1 trade, net +$150
  { id: '6', symbol: 'MGC', side: 'LONG', quantity: 1, entryPrice: 4250, exitPrice: 4265, entryTime: '2024-01-17T10:30:00Z', exitTime: '2024-01-17T11:00:00Z', pnl: 150, fees: 2, status: 'closed' },
]

// Test helper
function assertEqual(actual: number, expected: number, name: string, tolerance = 0.01) {
  const diff = Math.abs(actual - expected)
  if (diff > tolerance) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   Expected: ${expected}, Got: ${actual}`)
    return false
  }
  console.log(`✅ PASS: ${name} = ${actual}`)
  return true
}

// Run tests
function runTests() {
  console.log('\n========================================')
  console.log('Trade Analytics Test Harness')
  console.log('========================================\n')

  let passed = 0
  let failed = 0

  // Test 1: calculateTradePnl
  console.log('--- Test 1: calculateTradePnl ---')
  {
    const longTrade = calculateTradePnl('LONG', 100, 110, 10, 5)
    if (assertEqual(longTrade.grossPnl, 100, 'LONG grossPnl (100 + 10 @ $10)')) passed++; else failed++
    if (assertEqual(longTrade.netPnl, 95, 'LONG netPnl (100 - 5 fees)')) passed++; else failed++

    const shortTrade = calculateTradePnl('SHORT', 100, 90, 10, 5)
    if (assertEqual(shortTrade.grossPnl, 100, 'SHORT grossPnl (sell 100, buy 90, qty 10)')) passed++; else failed++
    if (assertEqual(shortTrade.netPnl, 95, 'SHORT netPnl (100 - 5 fees)')) passed++; else failed++

    const losingLong = calculateTradePnl('LONG', 100, 95, 10, 5)
    if (assertEqual(losingLong.grossPnl, -50, 'Losing LONG grossPnl')) passed++; else failed++
    if (assertEqual(losingLong.netPnl, -55, 'Losing LONG netPnl')) passed++; else failed++
  }

  // Test 2: calculateTradeStats
  console.log('\n--- Test 2: calculateTradeStats ---')
  {
    const stats = calculateTradeStats(testTrades)
    
    // Net P&L: 100 + 200 - 100 - 50 + 0 + 150 = 300
    if (assertEqual(stats.netPnl, 300, 'Net P&L')) passed++; else failed++
    
    // Total trades: 6
    if (assertEqual(stats.totalTrades, 6, 'Total trades')) passed++; else failed++
    
    // Winners: 3 (trades 1, 2, 6)
    if (assertEqual(stats.winningTrades, 3, 'Winning trades')) passed++; else failed++
    
    // Losers: 2 (trades 3, 4)
    if (assertEqual(stats.losingTrades, 2, 'Losing trades')) passed++; else failed++
    
    // Breakeven: 1 (trade 5)
    if (assertEqual(stats.breakEvenTrades, 1, 'Breakeven trades')) passed++; else failed++
    
    // Trade Win Rate: 3/6 = 50%
    if (assertEqual(stats.tradeWinRate, 50, 'Trade Win Rate')) passed++; else failed++
    
    // Profit Factor: (100+200+150) / |(-100)+(-50)| = 450/150 = 3.0
    if (assertEqual(stats.profitFactor, 3.0, 'Profit Factor')) passed++; else failed++
    
    // Avg Win: 450/3 = 150
    if (assertEqual(stats.avgWin, 150, 'Avg Win')) passed++; else failed++
    
    // Avg Loss: 150/2 = 75
    if (assertEqual(stats.avgLoss, 75, 'Avg Loss')) passed++; else failed++
    
    // Avg Win/Loss Ratio: 150/75 = 2.0
    if (assertEqual(stats.avgWinLossRatio, 2.0, 'Avg Win/Loss Ratio')) passed++; else failed++
    
    // Trading days: 3
    if (assertEqual(stats.tradingDays, 3, 'Trading days')) passed++; else failed++
    
    // Winning days: 2 (day 1 and 3)
    if (assertEqual(stats.winningDays, 2, 'Winning days')) passed++; else failed++
    
    // Losing days: 1 (day 2)
    if (assertEqual(stats.losingDays, 1, 'Losing days')) passed++; else failed++
    
    // Daily Win Rate: 2/3 = 66.7%
    if (assertEqual(stats.dailyWinRate, 66.7, 'Daily Win Rate')) passed++; else failed++
  }

  // Test 3: calculateDailyPnl
  console.log('\n--- Test 3: calculateDailyPnl ---')
  {
    const daily = calculateDailyPnl(testTrades)
    
    if (assertEqual(daily.length, 3, 'Number of trading days')) passed++; else failed++
    
    // Day 1: 100 + 200 - 100 = 200
    const day1 = daily.find(d => d.date === '2024-01-15')
    if (day1 && assertEqual(day1.netPnl, 200, 'Day 1 (2024-01-15) P&L')) passed++; else failed++
    if (day1 && assertEqual(day1.tradeCount, 3, 'Day 1 trade count')) passed++; else failed++
    
    // Day 2: -50 + 0 = -50
    const day2 = daily.find(d => d.date === '2024-01-16')
    if (day2 && assertEqual(day2.netPnl, -50, 'Day 2 (2024-01-16) P&L')) passed++; else failed++
    
    // Day 3: 150
    const day3 = daily.find(d => d.date === '2024-01-17')
    if (day3 && assertEqual(day3.netPnl, 150, 'Day 3 (2024-01-17) P&L')) passed++; else failed++
  }

  // Test 4: calculateEquityCurve
  console.log('\n--- Test 4: calculateEquityCurve ---')
  {
    const daily = calculateDailyPnl(testTrades)
    const equity = calculateEquityCurve(daily)
    
    if (assertEqual(equity.length, 3, 'Equity curve length')) passed++; else failed++
    
    // Day 1: cumulative = 200
    if (assertEqual(equity[0].equity, 200, 'Day 1 equity')) passed++; else failed++
    if (assertEqual(equity[0].drawdown, 0, 'Day 1 drawdown (at peak)')) passed++; else failed++
    
    // Day 2: cumulative = 200 - 50 = 150, drawdown = 150 - 200 = -50
    if (assertEqual(equity[1].equity, 150, 'Day 2 equity')) passed++; else failed++
    if (assertEqual(equity[1].drawdown, -50, 'Day 2 drawdown')) passed++; else failed++
    
    // Day 3: cumulative = 150 + 150 = 300, new peak
    if (assertEqual(equity[2].equity, 300, 'Day 3 equity')) passed++; else failed++
    if (assertEqual(equity[2].drawdown, 0, 'Day 3 drawdown (new peak)')) passed++; else failed++
  }

  // Test 5: calculateSymbolStats
  console.log('\n--- Test 5: calculateSymbolStats ---')
  {
    const symbols = calculateSymbolStats(testTrades)
    
    const mgc = symbols.find(s => s.symbol === 'MGC')
    // MGC: 100 + 200 - 50 + 150 = 400, 4 trades, 3 wins
    if (mgc && assertEqual(mgc.pnl, 400, 'MGC P&L')) passed++; else failed++
    if (mgc && assertEqual(mgc.tradeCount, 4, 'MGC trade count')) passed++; else failed++
    if (mgc && assertEqual(mgc.winRate, 75, 'MGC win rate')) passed++; else failed++
    
    const es = symbols.find(s => s.symbol === 'ES')
    // ES: -100 + 0 = -100, 2 trades, 0 wins
    if (es && assertEqual(es.pnl, -100, 'ES P&L')) passed++; else failed++
    if (es && assertEqual(es.tradeCount, 2, 'ES trade count')) passed++; else failed++
    if (es && assertEqual(es.winRate, 0, 'ES win rate')) passed++; else failed++
  }

  // Test 6: Empty trades
  console.log('\n--- Test 6: Empty trades ---')
  {
    const stats = calculateTradeStats([])
    if (assertEqual(stats.netPnl, 0, 'Empty: Net P&L')) passed++; else failed++
    if (assertEqual(stats.totalTrades, 0, 'Empty: Total trades')) passed++; else failed++
    if (assertEqual(stats.profitFactor, 0, 'Empty: Profit Factor')) passed++; else failed++
  }

  // Summary
  console.log('\n========================================')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('========================================\n')
  
  return failed === 0
}

// Run if executed directly
runTests()

