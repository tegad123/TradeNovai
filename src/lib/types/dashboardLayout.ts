// Dashboard Layout Types

export interface DashboardSection {
  id: string
  label: string
  enabled: boolean
}

export interface DashboardLayout {
  version: number
  kpis: string[]
  sections: DashboardSection[]
}

// Available KPI options
export const AVAILABLE_KPIS = [
  { id: "netPnL", label: "Net P&L" },
  { id: "tradeWin", label: "Trade Win %" },
  { id: "profitFactor", label: "Profit Factor" },
  { id: "dailyWin", label: "Daily Win %" },
  { id: "avgWinLoss", label: "Avg Win/Loss Trade" },
] as const

// Available dashboard sections
export const AVAILABLE_SECTIONS = [
  { id: "kpiRow", label: "KPI Row" },
  { id: "novaScore", label: "Nova Score Panel" },
  { id: "progressTracker", label: "Progress Tracker" },
  { id: "equityCurve", label: "Equity Curve" },
  { id: "dailyPnL", label: "Daily P&L Bars" },
  { id: "recentTrades", label: "Recent Trades Table" },
  { id: "accountBalance", label: "Account Balance" },
  { id: "calendar", label: "Calendar P&L" },
  { id: "drawdown", label: "Drawdown Chart" },
  { id: "tradeTime", label: "Trade Time Scatter" },
  { id: "tradeDuration", label: "Trade Duration Scatter" },
] as const

// Default dashboard layout
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  version: 1,
  kpis: ["netPnL", "tradeWin", "profitFactor", "dailyWin", "avgWinLoss"],
  sections: AVAILABLE_SECTIONS.map(section => ({
    id: section.id,
    label: section.label,
    enabled: true,
  })),
}

// Type for KPI IDs
export type KPIId = typeof AVAILABLE_KPIS[number]["id"]

// Type for Section IDs
export type SectionId = typeof AVAILABLE_SECTIONS[number]["id"]

