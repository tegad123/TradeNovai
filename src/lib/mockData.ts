// Mock data for dashboard

export const mockKPIs = {
  netPnL: {
    value: 12847.53,
    trend: "up" as const,
    trendValue: "+18.2% this month",
  },
  // Trade Win % - winning trades / total trades
  tradeWin: {
    value: 31.78,
    wins: 34,
    losses: 73,
  },
  profitFactor: {
    value: 1.82,
    trend: "up" as const,
    trendValue: "+0.12 vs last month",
  },
  // Daily Win % - winning days / total trading days
  dailyWin: {
    value: 57.58,
    winDays: 19,
    lossDays: 14,
  },
  avgWinLoss: {
    value: 3.90,
    avgWin: 964,
    avgLoss: -247,
    trend: "up" as const,
    trendValue: "+0.15 improvement",
  },
}

export const mockNovaScore = {
  score: 31,
  data: [
    { subject: "Win %", value: 85, fullMark: 100 },
    { subject: "Profit factor", value: 60, fullMark: 100 },
    { subject: "Avg win/loss", value: 45, fullMark: 100 },
    { subject: "Recovery factor", value: 20, fullMark: 100 },
    { subject: "Max drawdown", value: 15, fullMark: 100 },
    { subject: "Consistency", value: 55, fullMark: 100 },
  ],
}

export const mockWeekProgress = [
  { day: "Mon", score: 85 },
  { day: "Tue", score: 72 },
  { day: "Wed", score: 68 },
  { day: "Thu", score: 90 },
  { day: "Fri", score: 75 },
  { day: "Sat", score: null },
  { day: "Sun", score: null },
]

export const mockEquityCurve = [
  { date: "Jan 1", value: 10000 },
  { date: "Jan 2", value: 10250 },
  { date: "Jan 3", value: 10180 },
  { date: "Jan 4", value: 10450 },
  { date: "Jan 5", value: 10320 },
  { date: "Jan 6", value: 10580 },
  { date: "Jan 7", value: 10750 },
  { date: "Jan 8", value: 10680 },
  { date: "Jan 9", value: 10920 },
  { date: "Jan 10", value: 11100 },
  { date: "Jan 11", value: 11050 },
  { date: "Jan 12", value: 11280 },
  { date: "Jan 13", value: 11450 },
  { date: "Jan 14", value: 11380 },
  { date: "Jan 15", value: 11620 },
  { date: "Jan 16", value: 11850 },
  { date: "Jan 17", value: 11780 },
  { date: "Jan 18", value: 12050 },
  { date: "Jan 19", value: 12200 },
  { date: "Jan 20", value: 12100 },
  { date: "Jan 21", value: 12350 },
  { date: "Jan 22", value: 12520 },
  { date: "Jan 23", value: 12480 },
  { date: "Jan 24", value: 12750 },
  { date: "Jan 25", value: 12848 },
]

export const mockDailyPnL = [
  { date: "Jan 1", pnl: 250 },
  { date: "Jan 2", pnl: -70 },
  { date: "Jan 3", pnl: 270 },
  { date: "Jan 4", pnl: -130 },
  { date: "Jan 5", pnl: 260 },
  { date: "Jan 6", pnl: 170 },
  { date: "Jan 7", pnl: -70 },
  { date: "Jan 8", pnl: 240 },
  { date: "Jan 9", pnl: 180 },
  { date: "Jan 10", pnl: -50 },
  { date: "Jan 11", pnl: 230 },
  { date: "Jan 12", pnl: 170 },
  { date: "Jan 13", pnl: -70 },
  { date: "Jan 14", pnl: 240 },
  { date: "Jan 15", pnl: 230 },
  { date: "Jan 16", pnl: -70 },
  { date: "Jan 17", pnl: 270 },
  { date: "Jan 18", pnl: 150 },
  { date: "Jan 19", pnl: -100 },
  { date: "Jan 20", pnl: 250 },
  { date: "Jan 21", pnl: 170 },
  { date: "Jan 22", pnl: -40 },
  { date: "Jan 23", pnl: 270 },
  { date: "Jan 24", pnl: 98 },
]

export const mockAccountBalance = [
  { date: "Jan 1", balance: 10000, deposits: 0, withdrawals: 0 },
  { date: "Jan 5", balance: 10320, deposits: 0, withdrawals: 0 },
  { date: "Jan 10", balance: 11100, deposits: 500, withdrawals: 0 },
  { date: "Jan 15", balance: 11620, deposits: 0, withdrawals: 0 },
  { date: "Jan 20", balance: 12100, deposits: 0, withdrawals: 200 },
  { date: "Jan 25", balance: 12848, deposits: 0, withdrawals: 0 },
]

export const mockTrades = [
  { id: "1", symbol: "AAPL", side: "long" as const, entryPrice: 178.50, exitPrice: 182.30, pnl: 380.00, status: "closed" as const, date: "Jan 24" },
  { id: "2", symbol: "TSLA", side: "short" as const, entryPrice: 248.20, exitPrice: 245.80, pnl: 240.00, status: "closed" as const, date: "Jan 24" },
  { id: "3", symbol: "NVDA", side: "long" as const, entryPrice: 485.00, exitPrice: 478.50, pnl: -650.00, status: "closed" as const, date: "Jan 23" },
  { id: "4", symbol: "SPY", side: "long" as const, entryPrice: 472.50, exitPrice: 475.20, pnl: 270.00, status: "closed" as const, date: "Jan 23" },
  { id: "5", symbol: "META", side: "long" as const, entryPrice: 385.00, exitPrice: 392.40, pnl: 740.00, status: "closed" as const, date: "Jan 22" },
  { id: "6", symbol: "AMD", side: "long" as const, entryPrice: 142.30, status: "open" as const, date: "Jan 25" },
  { id: "7", symbol: "GOOGL", side: "short" as const, entryPrice: 141.80, status: "open" as const, date: "Jan 25" },
]

export const mockDrawdown = [
  { date: "Jan 1", drawdown: 0 },
  { date: "Jan 3", drawdown: -0.7 },
  { date: "Jan 5", drawdown: 0 },
  { date: "Jan 8", drawdown: -0.6 },
  { date: "Jan 10", drawdown: 0 },
  { date: "Jan 12", drawdown: -0.4 },
  { date: "Jan 14", drawdown: -0.8 },
  { date: "Jan 16", drawdown: 0 },
  { date: "Jan 18", drawdown: -0.5 },
  { date: "Jan 20", drawdown: -0.9 },
  { date: "Jan 22", drawdown: 0 },
  { date: "Jan 25", drawdown: -0.3 },
]

export const mockTradeTimePerformance = [
  { hour: 9, pnl: 320, trades: 5 },
  { hour: 10, pnl: 580, trades: 8 },
  { hour: 11, pnl: 240, trades: 4 },
  { hour: 12, pnl: -120, trades: 3 },
  { hour: 13, pnl: 180, trades: 4 },
  { hour: 14, pnl: 450, trades: 6 },
  { hour: 15, pnl: 280, trades: 5 },
]

export const mockTradeDurationPerformance = [
  { duration: "< 5m", pnl: 120, trades: 8 },
  { duration: "5-15m", pnl: 380, trades: 12 },
  { duration: "15-30m", pnl: 520, trades: 10 },
  { duration: "30m-1h", pnl: 280, trades: 6 },
  { duration: "1-2h", pnl: 180, trades: 4 },
  { duration: "> 2h", pnl: -80, trades: 2 },
]

export const mockCalendarData = {
  month: "January",
  year: 2025,
  weeks: [
    {
      days: [
        { date: 30, pnl: null, isCurrentMonth: false },
        { date: 31, pnl: null, isCurrentMonth: false },
        { date: 1, pnl: 250, isCurrentMonth: true },
        { date: 2, pnl: -70, isCurrentMonth: true },
        { date: 3, pnl: 270, isCurrentMonth: true },
        { date: 4, pnl: null, isCurrentMonth: true },
        { date: 5, pnl: null, isCurrentMonth: true },
      ],
      weeklyTotal: 450,
    },
    {
      days: [
        { date: 6, pnl: 260, isCurrentMonth: true },
        { date: 7, pnl: 170, isCurrentMonth: true },
        { date: 8, pnl: -70, isCurrentMonth: true },
        { date: 9, pnl: 240, isCurrentMonth: true },
        { date: 10, pnl: 180, isCurrentMonth: true },
        { date: 11, pnl: null, isCurrentMonth: true },
        { date: 12, pnl: null, isCurrentMonth: true },
      ],
      weeklyTotal: 780,
    },
    {
      days: [
        { date: 13, pnl: 230, isCurrentMonth: true },
        { date: 14, pnl: 170, isCurrentMonth: true },
        { date: 15, pnl: -70, isCurrentMonth: true },
        { date: 16, pnl: 240, isCurrentMonth: true },
        { date: 17, pnl: 230, isCurrentMonth: true },
        { date: 18, pnl: null, isCurrentMonth: true },
        { date: 19, pnl: null, isCurrentMonth: true },
      ],
      weeklyTotal: 800,
    },
    {
      days: [
        { date: 20, pnl: 270, isCurrentMonth: true },
        { date: 21, pnl: 150, isCurrentMonth: true },
        { date: 22, pnl: -100, isCurrentMonth: true },
        { date: 23, pnl: 250, isCurrentMonth: true },
        { date: 24, pnl: 170, isCurrentMonth: true },
        { date: 25, pnl: null, isCurrentMonth: true },
        { date: 26, pnl: null, isCurrentMonth: true },
      ],
      weeklyTotal: 740,
    },
    {
      days: [
        { date: 27, pnl: null, isCurrentMonth: true },
        { date: 28, pnl: null, isCurrentMonth: true },
        { date: 29, pnl: null, isCurrentMonth: true },
        { date: 30, pnl: null, isCurrentMonth: true },
        { date: 31, pnl: null, isCurrentMonth: true },
        { date: 1, pnl: null, isCurrentMonth: false },
        { date: 2, pnl: null, isCurrentMonth: false },
      ],
      weeklyTotal: 0,
    },
  ],
  monthlyTotal: 2770,
}

// Trade data interface matching the dashboard's TradeData type
interface DemoTradeData {
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

// Generate realistic demo trades for the past 90 days
export function generateDemoTrades(): DemoTradeData[] {
  const symbols = ['AAPL', 'TSLA', 'NVDA', 'SPY', 'META', 'AMD', 'GOOGL', 'AMZN', 'MSFT', 'QQQ']
  const trades: DemoTradeData[] = []
  const now = new Date()
  
  // Generate 2-5 trades per trading day for the last 90 days
  for (let daysAgo = 0; daysAgo < 90; daysAgo++) {
    const tradeDate = new Date(now)
    tradeDate.setDate(tradeDate.getDate() - daysAgo)
    
    // Skip weekends
    const dayOfWeek = tradeDate.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) continue
    
    // Generate 2-5 trades for this day
    const tradesThisDay = Math.floor(Math.random() * 4) + 2
    
    for (let i = 0; i < tradesThisDay; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      const side = Math.random() > 0.5 ? 'long' : 'short'
      const quantity = Math.floor(Math.random() * 50) + 10
      
      // Generate entry price based on symbol (realistic ranges)
      const basePrices: Record<string, number> = {
        'AAPL': 180, 'TSLA': 250, 'NVDA': 480, 'SPY': 475, 'META': 390,
        'AMD': 145, 'GOOGL': 142, 'AMZN': 178, 'MSFT': 410, 'QQQ': 420
      }
      const basePrice = basePrices[symbol] || 100
      const entryPrice = basePrice + (Math.random() - 0.5) * 20
      
      // Generate P&L with slight win bias (55% win rate)
      const isWinner = Math.random() < 0.55
      let pnlPercent: number
      if (isWinner) {
        // Winners: 0.5% to 3% gain
        pnlPercent = 0.005 + Math.random() * 0.025
      } else {
        // Losers: 0.3% to 2% loss
        pnlPercent = -(0.003 + Math.random() * 0.017)
      }
      
      const exitPrice = side === 'long' 
        ? entryPrice * (1 + pnlPercent)
        : entryPrice * (1 - pnlPercent)
      
      const pnl = side === 'long'
        ? (exitPrice - entryPrice) * quantity
        : (entryPrice - exitPrice) * quantity
      
      const fees = Math.round((Math.random() * 3 + 1) * 100) / 100 // $1-4 in fees
      
      // Generate entry and exit times during market hours (9:30 AM - 4:00 PM)
      const entryHour = 9 + Math.floor(Math.random() * 6) + (Math.random() > 0.5 ? 0.5 : 0)
      const exitHour = entryHour + Math.random() * 2 + 0.25
      
      const entryTime = new Date(tradeDate)
      entryTime.setHours(Math.floor(entryHour), Math.floor((entryHour % 1) * 60), 0, 0)
      
      const exitTime = new Date(tradeDate)
      exitTime.setHours(Math.floor(exitHour), Math.floor((exitHour % 1) * 60), 0, 0)
      
      trades.push({
        id: `demo-${daysAgo}-${i}-${Date.now()}`,
        symbol,
        side,
        quantity,
        entry_price: Math.round(entryPrice * 100) / 100,
        exit_price: Math.round(exitPrice * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        fees,
        entry_time: entryTime.toISOString(),
        exit_time: exitTime.toISOString(),
      })
    }
  }
  
  // Sort by exit_time descending (most recent first)
  trades.sort((a, b) => new Date(b.exit_time).getTime() - new Date(a.exit_time).getTime())
  
  return trades
}

