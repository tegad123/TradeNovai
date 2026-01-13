// Tradovate/TradingView Orders CSV Importer
// Handles CSV format with columns like:
// orderId,Account,Order ID,B/S,Contract,Product,Product Description,avgPrice,filledQty,Fill Time,...

import { ParsedExecution } from "@/lib/types/execution"

interface CsvRow {
  [key: string]: string
}

/**
 * Parse a CSV string handling quoted fields with commas
 */
function parseCSV(csvText: string): CsvRow[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) return []

  // Parse header
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine)

  // Parse data rows
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === headers.length) {
      const row: CsvRow = {}
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]
      })
      rows.push(row)
    }
  }

  return rows
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"' && !inQuotes) {
      inQuotes = true
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        inQuotes = false
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  // Don't forget the last field
  result.push(current.trim())

  return result
}

/**
 * Parse date string in format "MM/DD/YYYY HH:mm:ss" to Date
 */
function parseFillTime(fillTime: string, timezone?: string): Date | null {
  if (!fillTime || fillTime.trim() === "") return null

  // Handle format: "12/04/2025 07:52:59"
  const match = fillTime.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/)
  if (!match) return null

  const [, month, day, year, hour, minute, second] = match
  
  // Create date in local time (or specified timezone)
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  )

  return isNaN(date.getTime()) ? null : date
}

/**
 * Normalize side value (handles leading spaces like " Sell" / " Buy")
 */
function normalizeSide(side: string): "BUY" | "SELL" | null {
  const normalized = side.trim().toLowerCase()
  if (normalized === "buy") return "BUY"
  if (normalized === "sell") return "SELL"
  return null
}

/**
 * Parse a numeric value, removing commas
 */
function parseNumber(value: string): number | null {
  if (!value || value.trim() === "") return null
  // Remove commas and quotes
  const cleaned = value.replace(/[",]/g, "").trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Parse Tradovate/TradingView Orders CSV
 * Only imports filled orders
 */
export function parseTradovateOrdersCSV(
  csvText: string,
  timezone?: string
): { executions: ParsedExecution[]; skipped: number; errors: string[] } {
  const rows = parseCSV(csvText)
  const executions: ParsedExecution[] = []
  const errors: string[] = []
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 for header row and 0-indexing

    try {
      // Check status - only import Filled orders
      const status = (row["Status"] || "").trim()
      if (!status.toLowerCase().includes("filled")) {
        skipped++
        continue
      }

      // Parse side
      const side = normalizeSide(row["B/S"] || "")
      if (!side) {
        if (errors.length < 10) {
          errors.push(`Row ${rowNum}: Invalid side "${row["B/S"]}"`)
        }
        skipped++
        continue
      }

      // Parse quantity - try "Filled Qty" first, then "filledQty"
      const quantity = parseNumber(row["Filled Qty"]) ?? parseNumber(row["filledQty"])
      if (!quantity || quantity <= 0) {
        skipped++
        continue
      }

      // Parse price - try "Avg Fill Price" first, then "avgPrice"
      const price = parseNumber(row["Avg Fill Price"]) ?? parseNumber(row["avgPrice"])
      if (!price || price <= 0) {
        if (errors.length < 10) {
          errors.push(`Row ${rowNum}: Invalid price`)
        }
        skipped++
        continue
      }

      // Parse fill time
      const fillTime = row["Fill Time"] || ""
      const executedAt = parseFillTime(fillTime, timezone)
      if (!executedAt) {
        if (errors.length < 10) {
          errors.push(`Row ${rowNum}: Invalid fill time "${fillTime}"`)
        }
        skipped++
        continue
      }

      // Get required fields
      const externalId = row["Order ID"] || row["orderId"] || ""
      const account = row["Account"] || ""
      const symbol = row["Contract"] || ""
      const product = row["Product"] || ""
      const description = row["Product Description"] || ""
      const currency = row["Currency"] || "USD"

      if (!symbol) {
        if (errors.length < 10) {
          errors.push(`Row ${rowNum}: Missing symbol/contract`)
        }
        skipped++
        continue
      }

      executions.push({
        externalId,
        account,
        symbol,
        product,
        description,
        side,
        quantity,
        price,
        executedAt,
        currency,
        status: "Filled",
      })
    } catch (error) {
      if (errors.length < 10) {
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
      skipped++
    }
  }

  return { executions, skipped, errors }
}

/**
 * Get point value for a symbol (dollar value per 1.0 price move per contract)
 * MGC (E-Micro Gold): tickSize=0.1, tickValue=$1, so pointValue = $10
 */
function getPointValue(symbol: string): number {
  const upperSymbol = symbol.toUpperCase()
  
  // E-Micro Gold futures
  if (upperSymbol.includes('MGC')) return 10
  
  // E-Mini S&P 500
  if (upperSymbol.includes('ES') || upperSymbol.includes('MES')) return 50
  
  // E-Mini Nasdaq
  if (upperSymbol.includes('NQ') || upperSymbol.includes('MNQ')) return 20
  
  // Micro E-Mini Nasdaq
  if (upperSymbol.includes('MNQ')) return 2
  
  // E-Mini Russell
  if (upperSymbol.includes('RTY') || upperSymbol.includes('M2K')) return 50
  
  // Gold futures (GC)
  if (upperSymbol.includes('GC') && !upperSymbol.includes('MGC')) return 100
  
  // Crude Oil (CL)
  if (upperSymbol.includes('CL') || upperSymbol.includes('MCL')) return 1000
  
  // Default to 1 (raw price difference)
  return 1
}

/**
 * Derive closed trades from executions using FIFO matching
 * Aggregates individual closes into round-trips (flat → position → flat)
 */
export interface DerivedTrade {
  symbol: string
  product: string
  description: string
  side: "LONG" | "SHORT"
  quantity: number
  entryPrice: number
  exitPrice: number
  entryTime: Date
  exitTime: Date
  pnlPoints: number
  pnlDollars: number
  openExecutionId: string
  closeExecutionId: string
  currency: string
}

interface OpenLot {
  side: "BUY" | "SELL"
  quantity: number
  price: number
  time: Date
  executionId: string
}

// Represents a partial close within a round-trip
interface PartialClose {
  entryPrice: number
  exitPrice: number
  quantity: number
  entryTime: Date
  exitTime: Date
  pnlPoints: number
  openExecutionId: string
  closeExecutionId: string
}

export function deriveTradesFromExecutions(
  executions: ParsedExecution[]
): { trades: DerivedTrade[]; openPositions: OpenLot[] } {
  // Sort executions by time
  const sorted = [...executions].sort(
    (a, b) => a.executedAt.getTime() - b.executedAt.getTime()
  )

  // Group by symbol
  const bySymbol: Map<string, ParsedExecution[]> = new Map()
  for (const exec of sorted) {
    const existing = bySymbol.get(exec.symbol) || []
    existing.push(exec)
    bySymbol.set(exec.symbol, existing)
  }

  const allTrades: DerivedTrade[] = []
  const allOpenPositions: OpenLot[] = []

  // Process each symbol
  bySymbol.forEach((symbolExecutions, symbol) => {
    const pointValue = getPointValue(symbol)
    const openLots: OpenLot[] = []
    const roundTripTrades: DerivedTrade[] = []
    
    // Track partial closes for current round-trip
    let currentRoundTrip: PartialClose[] = []
    let roundTripSide: "LONG" | "SHORT" | null = null
    let roundTripProduct = ""
    let roundTripDescription = ""
    let roundTripCurrency = "USD"

    for (const exec of symbolExecutions) {
      let remainingQty = exec.quantity

      // Check if this is closing or adding to position
      const isClosing = openLots.length > 0 && openLots[0].side !== exec.side

      if (isClosing) {
        // Close against open lots FIFO
        while (remainingQty > 0 && openLots.length > 0) {
          const openLot = openLots[0]
          const closeQty = Math.min(remainingQty, openLot.quantity)

          // Calculate P&L in points
          const isLong = openLot.side === "BUY"
          const pnlPoints = isLong
            ? (exec.price - openLot.price) * closeQty
            : (openLot.price - exec.price) * closeQty

          // Add to current round-trip
          currentRoundTrip.push({
            entryPrice: openLot.price,
            exitPrice: exec.price,
            quantity: closeQty,
            entryTime: openLot.time,
            exitTime: exec.executedAt,
            pnlPoints,
            openExecutionId: openLot.executionId,
            closeExecutionId: exec.externalId,
          })
          
          if (!roundTripSide) {
            roundTripSide = isLong ? "LONG" : "SHORT"
            roundTripProduct = exec.product
            roundTripDescription = exec.description
            roundTripCurrency = exec.currency
          }

          // Update quantities
          remainingQty -= closeQty
          openLot.quantity -= closeQty

          // Remove lot if fully closed
          if (openLot.quantity <= 0) {
            openLots.shift()
          }
        }
        
        // If position is now flat, complete the round-trip
        if (openLots.length === 0 && currentRoundTrip.length > 0) {
          // Aggregate the round-trip into a single trade
          const totalQty = currentRoundTrip.reduce((sum, c) => sum + c.quantity, 0)
          const totalPnlPoints = currentRoundTrip.reduce((sum, c) => sum + c.pnlPoints, 0)
          const totalPnlDollars = totalPnlPoints * pointValue
          
          // Weighted average prices
          const weightedEntryPrice = currentRoundTrip.reduce(
            (sum, c) => sum + c.entryPrice * c.quantity, 0
          ) / totalQty
          const weightedExitPrice = currentRoundTrip.reduce(
            (sum, c) => sum + c.exitPrice * c.quantity, 0
          ) / totalQty
          
          // First entry time, last exit time
          const entryTime = currentRoundTrip.reduce(
            (earliest, c) => c.entryTime < earliest ? c.entryTime : earliest,
            currentRoundTrip[0].entryTime
          )
          const exitTime = currentRoundTrip.reduce(
            (latest, c) => c.exitTime > latest ? c.exitTime : latest,
            currentRoundTrip[0].exitTime
          )
          
          roundTripTrades.push({
            symbol,
            product: roundTripProduct,
            description: roundTripDescription,
            side: roundTripSide!,
            quantity: totalQty,
            entryPrice: Math.round(weightedEntryPrice * 100) / 100,
            exitPrice: Math.round(weightedExitPrice * 100) / 100,
            entryTime,
            exitTime,
            pnlPoints: Math.round(totalPnlPoints * 100) / 100,
            pnlDollars: Math.round(totalPnlDollars * 100) / 100,
            openExecutionId: currentRoundTrip[0].openExecutionId,
            closeExecutionId: currentRoundTrip[currentRoundTrip.length - 1].closeExecutionId,
            currency: roundTripCurrency,
          })
          
          // Reset for next round-trip
          currentRoundTrip = []
          roundTripSide = null
        }
      }

      // Add remaining quantity as new open lot
      if (remainingQty > 0) {
        openLots.push({
          side: exec.side,
          quantity: remainingQty,
          price: exec.price,
          time: exec.executedAt,
          executionId: exec.externalId,
        })
      }
    }

    allTrades.push(...roundTripTrades)
    allOpenPositions.push(...openLots.map(lot => ({ ...lot, symbol })))
  })

  return { trades: allTrades, openPositions: allOpenPositions }
}

