// Trade Firebase utilities

import { db } from "./firebase"
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  deleteDoc,
} from "firebase/firestore"
import { StoredTrade, Execution } from "@/lib/types/execution"

const TRADES_COLLECTION = "trades"
const EXECUTIONS_COLLECTION = "executions"

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Generate deterministic trade ID for deduplication
function generateTradeKey(trade: Omit<StoredTrade, "id" | "createdAt" | "updatedAt">): string {
  const key = `${trade.userId}-${trade.accountId}-${trade.symbol}-${trade.entryTime}-${trade.exitTime || "open"}-${trade.quantity}-${trade.entryPrice}-${trade.exitPrice || 0}`
  // Create a hash-like string
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `trade-${Math.abs(hash).toString(36)}`
}

// Generate deterministic execution ID for deduplication
function generateExecutionKey(exec: Omit<Execution, "id" | "createdAt">): string {
  const key = `${exec.userId}-${exec.externalId}-${exec.executedAt}-${exec.symbol}-${exec.side}-${exec.quantity}-${exec.price}`
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `exec-${Math.abs(hash).toString(36)}`
}

// Save executions (with deduplication)
export async function saveExecutions(
  userId: string,
  executions: Omit<Execution, "id" | "createdAt">[]
): Promise<{ saved: number; duplicates: number }> {
  if (!db) {
    console.error("Firestore is not initialized.")
    return { saved: 0, duplicates: 0 }
  }

  let saved = 0
  let duplicates = 0

  try {
    // Get existing execution IDs for this user
    const existingIds = new Set<string>()
    const executionsRef = collection(db, EXECUTIONS_COLLECTION)
    const q = query(executionsRef, where("userId", "==", userId))
    const snapshot = await getDocs(q)
    snapshot.forEach(doc => existingIds.add(doc.id))

    // Batch write new executions
    const batch = writeBatch(db)
    const now = new Date().toISOString()

    for (const exec of executions) {
      const id = generateExecutionKey(exec)
      
      if (existingIds.has(id)) {
        duplicates++
        continue
      }

      const docRef = doc(db, EXECUTIONS_COLLECTION, id)
      batch.set(docRef, {
        ...exec,
        id,
        createdAt: now,
      })
      saved++
    }

    if (saved > 0) {
      await batch.commit()
    }

    return { saved, duplicates }
  } catch (error) {
    console.error("Error saving executions:", error)
    return { saved: 0, duplicates: 0 }
  }
}

// Save trades (with deduplication)
export async function saveTrades(
  trades: Omit<StoredTrade, "id" | "createdAt" | "updatedAt">[]
): Promise<{ created: number; updated: number; duplicates: number }> {
  if (!db) {
    console.error("Firestore is not initialized.")
    return { created: 0, updated: 0, duplicates: 0 }
  }

  let created = 0
  let updated = 0
  let duplicates = 0

  try {
    // Get existing trade IDs for this user
    const userId = trades[0]?.userId
    if (!userId) return { created: 0, updated: 0, duplicates: 0 }

    const existingIds = new Set<string>()
    const tradesRef = collection(db, TRADES_COLLECTION)
    const q = query(tradesRef, where("userId", "==", userId))
    const snapshot = await getDocs(q)
    snapshot.forEach(doc => existingIds.add(doc.id))

    // Batch write new trades
    const batch = writeBatch(db)
    const now = new Date().toISOString()

    for (const trade of trades) {
      const id = generateTradeKey(trade)
      
      if (existingIds.has(id)) {
        duplicates++
        continue
      }

      const docRef = doc(db, TRADES_COLLECTION, id)
      batch.set(docRef, {
        ...trade,
        id,
        createdAt: now,
        updatedAt: now,
      })
      created++
    }

    if (created > 0) {
      await batch.commit()
    }

    return { created, updated, duplicates }
  } catch (error) {
    console.error("Error saving trades:", error)
    return { created: 0, updated: 0, duplicates: 0 }
  }
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
  if (!db) {
    console.error("Firestore is not initialized.")
    return []
  }

  try {
    const tradesRef = collection(db, TRADES_COLLECTION)
    let q = query(
      tradesRef,
      where("userId", "==", userId),
      orderBy("entryTime", "desc")
    )

    const snapshot = await getDocs(q)
    let trades: StoredTrade[] = []
    
    snapshot.forEach(docSnap => {
      trades.push(docSnap.data() as StoredTrade)
    })

    // Apply filters (Firestore doesn't support multiple inequalities)
    if (options?.accountId) {
      trades = trades.filter(t => t.accountId === options.accountId)
    }
    if (options?.startDate) {
      trades = trades.filter(t => t.entryTime >= options.startDate!)
    }
    if (options?.endDate) {
      trades = trades.filter(t => t.entryTime <= options.endDate!)
    }
    if (options?.status && options.status !== "all") {
      trades = trades.filter(t => t.status === options.status)
    }

    return trades
  } catch (error) {
    console.error("Error listing trades:", error)
    return []
  }
}

// List executions for a user
export async function listExecutions(
  userId: string,
  options?: {
    accountId?: string
    startDate?: string
    endDate?: string
  }
): Promise<Execution[]> {
  if (!db) {
    console.error("Firestore is not initialized.")
    return []
  }

  try {
    const executionsRef = collection(db, EXECUTIONS_COLLECTION)
    let q = query(
      executionsRef,
      where("userId", "==", userId),
      orderBy("executedAt", "desc")
    )

    const snapshot = await getDocs(q)
    let executions: Execution[] = []
    
    snapshot.forEach(docSnap => {
      executions.push(docSnap.data() as Execution)
    })

    // Apply filters
    if (options?.accountId) {
      executions = executions.filter(e => e.accountId === options.accountId)
    }
    if (options?.startDate) {
      executions = executions.filter(e => e.executedAt >= options.startDate!)
    }
    if (options?.endDate) {
      executions = executions.filter(e => e.executedAt <= options.endDate!)
    }

    return executions
  } catch (error) {
    console.error("Error listing executions:", error)
    return []
  }
}

// Delete all trades for a user (for testing/reset)
export async function deleteAllTrades(userId: string): Promise<boolean> {
  if (!db) {
    console.error("Firestore is not initialized.")
    return false
  }

  try {
    const tradesRef = collection(db, TRADES_COLLECTION)
    const q = query(tradesRef, where("userId", "==", userId))
    const snapshot = await getDocs(q)
    
    const batch = writeBatch(db)
    snapshot.forEach(docSnap => {
      batch.delete(docSnap.ref)
    })
    
    await batch.commit()
    return true
  } catch (error) {
    console.error("Error deleting trades:", error)
    return false
  }
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

  const closedTrades = trades.filter(t => t.status === "closed")
  const openTrades = trades.filter(t => t.status === "open")
  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0)
  const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0)

  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0))

  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0

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

