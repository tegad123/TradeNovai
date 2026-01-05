// Execution and Trade types for import/storage

export interface Execution {
  id: string
  userId: string
  accountId: string
  broker: string
  externalId: string
  symbol: string
  product?: string
  description?: string
  side: "BUY" | "SELL"
  quantity: number
  price: number
  executedAt: string // ISO string
  currency: string
  createdAt: string
}

export interface StoredTrade {
  id: string
  userId: string
  accountId: string
  broker: string
  symbol: string
  product?: string
  description?: string
  side: "LONG" | "SHORT"
  quantity: number
  entryPrice: number
  exitPrice?: number
  entryTime: string // ISO string
  exitTime?: string // ISO string
  pnl?: number
  pnlPoints?: number
  fees: number
  commissions: number
  status: "open" | "closed"
  instrumentType: "future" | "stock" | "option" | "forex" | "crypto" | "cfd"
  currency: string
  // For deduplication
  openExecutionId?: string
  closeExecutionId?: string
  createdAt: string
  updatedAt: string
}

export interface ImportResult {
  success: boolean
  executionsImported: number
  tradesCreated: number
  tradesUpdated: number
  skippedRows: number
  errors: string[]
}

export interface ParsedExecution {
  externalId: string
  account: string
  symbol: string
  product: string
  description: string
  side: "BUY" | "SELL"
  quantity: number
  price: number
  executedAt: Date
  currency: string
  status: string
}

