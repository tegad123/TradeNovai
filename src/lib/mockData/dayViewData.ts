// Mock data for Day View trades page

import { DayData, DayViewData, CalendarDay, Trade, DayEquityPoint } from "@/lib/types/trades"

// Helper to generate random trades
function generateTrades(date: string, count: number): Trade[] {
  const symbols = ["ES", "NQ", "CL", "GC", "AAPL", "TSLA", "SPY", "QQQ"]
  const trades: Trade[] = []
  
  for (let i = 0; i < count; i++) {
    const side = Math.random() > 0.5 ? "LONG" : "SHORT"
    const symbol = symbols[Math.floor(Math.random() * symbols.length)]
    const entryPrice = 100 + Math.random() * 400
    const pnlPercent = (Math.random() - 0.4) * 0.1 // Slightly biased positive
    const exitPrice = side === "LONG" 
      ? entryPrice * (1 + pnlPercent)
      : entryPrice * (1 - pnlPercent)
    const quantity = Math.floor(Math.random() * 10) + 1
    const pnl = (exitPrice - entryPrice) * quantity * (side === "LONG" ? 1 : -1)
    const commission = quantity * 2.5
    
    const hour = 9 + Math.floor(Math.random() * 7)
    const minute = Math.floor(Math.random() * 60)
    const duration = Math.floor(Math.random() * 120) + 5
    
    trades.push({
      id: `${date}-${i}`,
      symbol,
      side,
      quantity,
      entryPrice: Math.round(entryPrice * 100) / 100,
      exitPrice: Math.round(exitPrice * 100) / 100,
      entryTime: `${date}T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`,
      exitTime: `${date}T${hour.toString().padStart(2, "0")}:${(minute + duration % 60).toString().padStart(2, "0")}:00`,
      pnl: Math.round(pnl * 100) / 100,
      commission,
      fee: commission * 0.1,
      instrumentType: "future",
    })
  }
  
  return trades.sort((a, b) => a.entryTime.localeCompare(b.entryTime))
}

// Helper to generate equity series
function generateEquitySeries(trades: Trade[]): DayEquityPoint[] {
  const points: DayEquityPoint[] = []
  let cumulative = 0
  
  // Start of day
  if (trades.length > 0) {
    points.push({ time: "09:30", value: 0 })
  }
  
  trades.forEach((trade, index) => {
    cumulative += trade.pnl - trade.commission - trade.fee
    const hour = parseInt(trade.exitTime.split("T")[1].split(":")[0])
    const minute = parseInt(trade.exitTime.split("T")[1].split(":")[1])
    points.push({
      time: `${hour}:${minute.toString().padStart(2, "0")}`,
      value: Math.round(cumulative * 100) / 100,
    })
  })
  
  // End of day
  if (trades.length > 0) {
    points.push({ time: "16:00", value: cumulative })
  }
  
  return points
}

// Format date label
function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// Generate day data
function generateDayData(dateStr: string, tradeCount: number): DayData {
  const trades = generateTrades(dateStr, tradeCount)
  const equitySeries = generateEquitySeries(trades)
  
  const winners = trades.filter(t => t.pnl > 0)
  const losers = trades.filter(t => t.pnl <= 0)
  
  const grossPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
  const commissions = trades.reduce((sum, t) => sum + t.commission + t.fee, 0)
  const netPnl = grossPnl - commissions
  
  const winSum = winners.reduce((sum, t) => sum + t.pnl, 0)
  const lossSum = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0))
  const profitFactor = lossSum > 0 ? winSum / lossSum : winSum > 0 ? Infinity : 0
  
  const volume = trades.reduce((sum, t) => sum + t.quantity, 0)
  
  return {
    date: dateStr,
    dayLabel: formatDayLabel(dateStr),
    netPnl: Math.round(netPnl * 100) / 100,
    grossPnl: Math.round(grossPnl * 100) / 100,
    commissions: Math.round(commissions * 100) / 100,
    volume,
    profitFactor: Math.round(profitFactor * 100) / 100,
    totalTrades: trades.length,
    winners: winners.length,
    losers: losers.length,
    winrate: trades.length > 0 ? Math.round((winners.length / trades.length) * 100) : 0,
    equitySeries,
    trades,
  }
}

// Generate mock day view data for the last N days
export function generateMockDayViewData(days: number = 30): DayViewData {
  const today = new Date()
  const dayDataList: DayData[] = []
  const calendarDays: CalendarDay[] = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    
    // Skip weekends for trading
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      calendarDays.push({
        date: dateStr,
        netPnl: null,
        hasTrades: false,
      })
      continue
    }
    
    // Random chance of having trades (80%)
    const hasTrades = Math.random() > 0.2
    
    if (hasTrades) {
      const tradeCount = Math.floor(Math.random() * 8) + 2
      const dayData = generateDayData(dateStr, tradeCount)
      dayDataList.push(dayData)
      calendarDays.push({
        date: dateStr,
        netPnl: dayData.netPnl,
        hasTrades: true,
      })
    } else {
      calendarDays.push({
        date: dateStr,
        netPnl: null,
        hasTrades: false,
      })
    }
  }
  
  return {
    days: dayDataList,
    calendar: {
      month: today.getMonth(),
      year: today.getFullYear(),
      dailyPnl: calendarDays,
    },
  }
}

// Static mock data for initial render
export const mockDayViewData = generateMockDayViewData(30)

