// Trade and Execution Supabase utilities

import { createClientSafe } from "./browser"
import { StoredTrade, Execution } from "@/lib/types/execution"
import { SupabaseClient } from "@supabase/supabase-js"

// Type for optional Supabase client parameter
type SupabaseClientArg = SupabaseClient | null | undefined

// Helper to get client (uses provided client or falls back to browser client)
function getClient(providedClient?: SupabaseClientArg): SupabaseClient | null {
  if (providedClient) return providedClient
  return createClientSafe()
}

// ============================================
// EXECUTIONS
// ============================================

export async function saveExecutions(
  userId: string,
  executions: Omit<Execution, "id" | "createdAt">[],
  supabaseClient?: SupabaseClientArg
): Promise<{ saved: number; duplicates: number }> {
  const supabase = getClient(supabaseClient)
  if (!supabase) {
    console.error("Supabase is not configured")
    return { saved: 0, duplicates: 0 }
  }

  let saved = 0
  let duplicates = 0

  for (const exec of executions) {
    const { error } = await supabase.from("executions").insert({
      user_id: userId,
      account_id: exec.accountId,
      broker: exec.broker,
      external_id: exec.externalId,
      symbol: exec.symbol,
      product: exec.product,
      description: exec.description,
      side: exec.side,
      quantity: exec.quantity,
      price: exec.price,
      executed_at: exec.executedAt,
      currency: exec.currency,
    })

    if (error) {
      // Unique constraint violation = duplicate
      if (error.code === "23505") {
        duplicates++
      } else {
        console.error("Error saving execution:", error)
      }
    } else {
      saved++
    }
  }

  return { saved, duplicates }
}

// ============================================
// TRADES
// ============================================

export async function saveTrades(
  trades: Omit<StoredTrade, "id" | "createdAt" | "updatedAt">[],
  supabaseClient?: SupabaseClientArg
): Promise<{ created: number; updated: number; duplicates: number }> {
  const supabase = getClient(supabaseClient)
  if (!supabase) {
    console.error("Supabase is not configured")
    return { created: 0, updated: 0, duplicates: 0 }
  }

  let created = 0
  let duplicates = 0

  for (const trade of trades) {
    // Check for existing trade with same key fields
    const { data: existing } = await supabase
      .from("trades")
      .select("id")
      .eq("user_id", trade.userId)
      .eq("symbol", trade.symbol)
      .eq("entry_time", trade.entryTime)
      .eq("quantity", trade.quantity)
      .eq("entry_price", trade.entryPrice)
      .maybeSingle()

    if (existing) {
      duplicates++
      continue
    }

    const { error } = await supabase.from("trades").insert({
      user_id: trade.userId,
      account_id: trade.accountId,
      broker: trade.broker,
      symbol: trade.symbol,
      product: trade.product,
      description: trade.description,
      side: trade.side,
      quantity: trade.quantity,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      entry_time: trade.entryTime,
      exit_time: trade.exitTime,
      pnl: trade.pnl,
      pnl_points: trade.pnlPoints,
      fees: trade.fees,
      commissions: trade.commissions,
      status: trade.status,
      instrument_type: trade.instrumentType,
      currency: trade.currency,
      open_execution_id: trade.openExecutionId,
      close_execution_id: trade.closeExecutionId,
    })

    if (error) {
      console.error("Error saving trade:", error)
    } else {
      created++
    }
  }

  return { created, updated: 0, duplicates }
}

// List trades for a user
export async function listTrades(
  userId: string,
  options?: {
    accountId?: string
    startDate?: string
    endDate?: string
    status?: "open" | "closed" | "all"
  }
): Promise<StoredTrade[]> {
  const supabase = createClientSafe()
  if (!supabase) {
    console.error("Supabase is not configured")
    return []
  }

  let query = supabase
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .order("entry_time", { ascending: false })

  if (options?.accountId) {
    query = query.eq("account_id", options.accountId)
  }
  if (options?.startDate) {
    query = query.gte("entry_time", options.startDate)
  }
  if (options?.endDate) {
    query = query.lte("entry_time", options.endDate)
  }
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error listing trades:", error)
    return []
  }

  // Map from snake_case to camelCase
  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    broker: row.broker,
    symbol: row.symbol,
    product: row.product,
    description: row.description,
    side: row.side,
    quantity: row.quantity,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price,
    entryTime: row.entry_time,
    exitTime: row.exit_time,
    pnl: row.pnl,
    pnlPoints: row.pnl_points,
    fees: row.fees,
    commissions: row.commissions,
    status: row.status,
    instrumentType: row.instrument_type,
    currency: row.currency,
    openExecutionId: row.open_execution_id,
    closeExecutionId: row.close_execution_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

// Get trade statistics for dashboard
export interface TradeStats {
  totalTrades: number
  closedTrades: number
  openTrades: number
  winningTrades: number
  losingTrades: number
  totalPnl: number
  avgWin: number
  avgLoss: number
  winRate: number
  profitFactor: number
}

export async function getTradeStats(
  userId: string,
  options?: {
    accountId?: string
    startDate?: string
    endDate?: string
  }
): Promise<TradeStats> {
  const trades = await listTrades(userId, {
    ...options,
    status: "all",
  })

  const closedTrades = trades.filter((t) => t.status === "closed")
  const openTrades = trades.filter((t) => t.status === "open")
  const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0)
  const losingTrades = closedTrades.filter((t) => (t.pnl || 0) < 0)

  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const totalLosses = Math.abs(
    losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  )

  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0
  const winRate =
    closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0
  const profitFactor =
    totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0

  return {
    totalTrades: trades.length,
    closedTrades: closedTrades.length,
    openTrades: openTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    totalPnl,
    avgWin,
    avgLoss,
    winRate,
    profitFactor: profitFactor === Infinity ? 999 : profitFactor,
  }
}

// Delete all trades for a user (for testing/reset)
export async function deleteAllTrades(userId: string): Promise<boolean> {
  const supabase = createClientSafe()
  if (!supabase) {
    console.error("Supabase is not configured")
    return false
  }

  const { error } = await supabase
    .from("trades")
    .delete()
    .eq("user_id", userId)

  if (error) {
    console.error("Error deleting trades:", error)
    return false
  }

  return true
}

