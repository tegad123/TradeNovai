// Hook for managing trades data

"use client"

import { useState, useEffect, useCallback } from "react"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { listTrades, getTradeStats, TradeStats } from "@/lib/supabase/tradeUtils"
import { StoredTrade } from "@/lib/types/execution"

export interface UseTradesOptions {
  accountId?: string
  startDate?: string
  endDate?: string
  status?: "open" | "closed" | "all"
}

export function useTrades(options?: UseTradesOptions) {
  const { user, loading: authLoading } = useSupabaseAuthContext()
  const [trades, setTrades] = useState<StoredTrade[]>([])
  const [stats, setStats] = useState<TradeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTrades = useCallback(async () => {
    if (authLoading) return
    
    if (!user?.id) {
      setTrades([])
      setStats(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [tradesData, statsData] = await Promise.all([
        listTrades(user.id, options),
        getTradeStats(user.id, options),
      ])
      setTrades(tradesData)
      setStats(statsData)
    } catch (err) {
      console.error("Error loading trades:", err)
      setError(err instanceof Error ? err.message : "Failed to load trades")
    } finally {
      setLoading(false)
    }
  }, [user?.id, authLoading, options?.accountId, options?.startDate, options?.endDate, options?.status])

  useEffect(() => {
    loadTrades()
  }, [loadTrades])

  return {
    trades,
    stats,
    loading,
    error,
    refresh: loadTrades,
  }
}

// Hook for getting trades grouped by day (for Day View)
export interface DayTradesData {
  date: string
  dateLabel: string
  netPnl: number
  grossPnl: number
  commissions: number
  fees: number
  totalTrades: number
  winners: number
  losers: number
  winrate: number
  volume: number
  profitFactor: number
  trades: StoredTrade[]
  equitySeries: { time: string; value: number }[]
}

export function useTradesDayView(options?: UseTradesOptions) {
  const { trades, stats, loading, error, refresh } = useTrades({
    ...options,
    status: "closed",
  })

  // Group trades by day
  const dayData: DayTradesData[] = []
  
  if (trades.length > 0) {
    const tradesByDay = new Map<string, StoredTrade[]>()
    
    for (const trade of trades) {
      // Use exit time for closed trades
      const dateKey = trade.exitTime?.split("T")[0] || trade.entryTime.split("T")[0]
      const existing = tradesByDay.get(dateKey) || []
      existing.push(trade)
      tradesByDay.set(dateKey, existing)
    }
    
    // Sort dates descending
    const sortedDates = Array.from(tradesByDay.keys()).sort((a, b) => b.localeCompare(a))
    
    for (const dateKey of sortedDates) {
      const dayTrades = tradesByDay.get(dateKey)!
      
      // Calculate day stats
      const winningTrades = dayTrades.filter(t => (t.pnl || 0) > 0)
      const losingTrades = dayTrades.filter(t => (t.pnl || 0) < 0)
      const totalPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
      const totalFees = dayTrades.reduce((sum, t) => sum + (t.fees || 0) + (t.commissions || 0), 0)
      const totalVolume = dayTrades.reduce((sum, t) => sum + t.quantity, 0)
      
      const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
      const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0))
      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0
      
      // Create equity series for day
      const sortedDayTrades = [...dayTrades].sort((a, b) => 
        (a.exitTime || a.entryTime).localeCompare(b.exitTime || b.entryTime)
      )
      let cumulative = 0
      const equitySeries = sortedDayTrades.map(t => {
        cumulative += t.pnl || 0
        return {
          time: t.exitTime || t.entryTime,
          value: cumulative,
        }
      })
      
      // Format date label
      const date = new Date(dateKey)
      const dateLabel = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      
      dayData.push({
        date: dateKey,
        dateLabel,
        netPnl: totalPnl,
        grossPnl: totalPnl + totalFees,
        commissions: totalFees,
        fees: totalFees,
        totalTrades: dayTrades.length,
        winners: winningTrades.length,
        losers: losingTrades.length,
        winrate: dayTrades.length > 0 ? (winningTrades.length / dayTrades.length) * 100 : 0,
        volume: totalVolume,
        profitFactor,
        trades: sortedDayTrades,
        equitySeries,
      })
    }
  }
  
  // Calculate calendar data
  const calendarData: Map<string, number> = new Map()
  for (const day of dayData) {
    calendarData.set(day.date, day.netPnl)
  }
  
  return {
    days: dayData,
    stats,
    calendarData,
    loading,
    error,
    refresh,
    hasTrades: trades.length > 0,
  }
}

