// Trade and Day View types

export interface Trade {
  id: string
  symbol: string
  side: "LONG" | "SHORT"
  quantity: number
  entryPrice: number
  exitPrice: number
  entryTime: string
  exitTime: string
  pnl: number
  commission: number
  fee: number
  instrumentType: "stock" | "option" | "future" | "forex" | "crypto" | "cfd"
}

export interface DayEquityPoint {
  time: string
  value: number
}

export interface DayData {
  date: string // ISO date string (YYYY-MM-DD)
  dayLabel: string // e.g., "Fri, Jun 28, 2024"
  netPnl: number
  grossPnl: number
  commissions: number
  volume: number
  profitFactor: number
  totalTrades: number
  winners: number
  losers: number
  winrate: number
  equitySeries: DayEquityPoint[]
  trades: Trade[]
  notes?: string
}

export interface CalendarDay {
  date: string
  netPnl: number | null
  hasTrades: boolean
}

export interface DayViewData {
  days: DayData[]
  calendar: {
    month: number
    year: number
    dailyPnl: CalendarDay[]
  }
}

export type TimeframeOption = "7D" | "14D" | "30D" | "thisMonth" | "custom"

export interface TradesFilter {
  accountId?: string
  symbol?: string
  instrumentType?: string
  outcome?: "win" | "loss" | "all"
  dateRange: {
    start: string
    end: string
  }
}

