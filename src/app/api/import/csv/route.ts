// API Route: POST /api/import/csv
// Imports trades from CSV files

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { parseTradovateOrdersCSV, deriveTradesFromExecutions } from "@/lib/importers/tradovateOrders"
import { saveExecutions, saveTrades } from "@/lib/supabase/tradeUtils"
import { StoredTrade, Execution, ImportResult } from "@/lib/types/execution"

// Create a Supabase server client for API routes
function createRouteClient() {
  const cookieStore = cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables not configured")
    return null
  }
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    // Create server client with authenticated session
    const supabase = createRouteClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase not configured" },
        { status: 500 }
      )
    }

    // Verify the user is authenticated via the session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const accountId = formData.get("accountId") as string | null
    const broker = formData.get("broker") as string | null
    const timezone = formData.get("timezone") as string | null
    const format = formData.get("format") as string | null // "tradovate" etc.

    // Use the authenticated user's ID (ignore any userId from form data for security)
    const userId = user.id

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      )
    }

    // Read file content
    const csvText = await file.text()

    if (!csvText.trim()) {
      return NextResponse.json(
        { success: false, error: "File is empty" },
        { status: 400 }
      )
    }

    // Parse CSV based on format
    let result: ImportResult

    if (!format || format === "tradovate" || format === "tradingview") {
      result = await importTradovateFormat(supabase, csvText, userId, accountId || "default", broker || "tradovate", timezone)
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported format: ${format}` },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during import",
      },
      { status: 500 }
    )
  }
}

async function importTradovateFormat(
  supabase: ReturnType<typeof createServerClient>,
  csvText: string,
  userId: string,
  accountId: string,
  broker: string,
  timezone?: string | null
): Promise<ImportResult> {
  console.log("[Import] Starting CSV parse, text length:", csvText.length)
  
  // Parse CSV
  const { executions: parsedExecutions, skipped, errors } = parseTradovateOrdersCSV(
    csvText,
    timezone || undefined
  )

  console.log("[Import] Parsed executions:", parsedExecutions.length)
  console.log("[Import] Skipped rows:", skipped)
  console.log("[Import] Parse errors:", errors)

  if (parsedExecutions.length === 0) {
    return {
      success: false,
      executionsImported: 0,
      tradesCreated: 0,
      tradesUpdated: 0,
      skippedRows: skipped,
      errors: errors.length > 0 ? errors : ["No valid executions found in CSV. Check that Status column contains 'Filled' rows."],
    }
  }

  // Convert to Execution objects
  const executionsToSave: Omit<Execution, "id" | "createdAt">[] = parsedExecutions.map(exec => ({
    userId,
    accountId,
    broker,
    externalId: exec.externalId,
    symbol: exec.symbol,
    product: exec.product,
    description: exec.description,
    side: exec.side,
    quantity: exec.quantity,
    price: exec.price,
    executedAt: exec.executedAt.toISOString(),
    currency: exec.currency,
  }))

  // Save executions using the authenticated server client
  console.log("[Import] Saving", executionsToSave.length, "executions to database...")
  const { saved: executionsSaved, duplicates: execDuplicates } = await saveExecutions(userId, executionsToSave, supabase)
  console.log("[Import] Executions saved:", executionsSaved, "duplicates:", execDuplicates)

  // Derive trades from executions
  const { trades: derivedTrades, openPositions } = deriveTradesFromExecutions(parsedExecutions)
  console.log("[Import] Derived trades:", derivedTrades.length, "open positions:", openPositions.length)

  // Convert to StoredTrade objects
  // pnl = pnlDollars (realized P&L in dollars after applying point value multiplier)
  const tradesToSave: Omit<StoredTrade, "id" | "createdAt" | "updatedAt">[] = derivedTrades.map(trade => ({
    userId,
    accountId,
    broker,
    symbol: trade.symbol,
    product: trade.product,
    description: trade.description,
    side: trade.side,
    quantity: trade.quantity,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    entryTime: trade.entryTime.toISOString(),
    exitTime: trade.exitTime.toISOString(),
    pnl: trade.pnlDollars, // Realized P&L in dollars
    pnlPoints: trade.pnlPoints,
    fees: 0,
    commissions: 0,
    status: "closed",
    instrumentType: "future", // Default for Tradovate
    currency: trade.currency,
    openExecutionId: trade.openExecutionId,
    closeExecutionId: trade.closeExecutionId,
  }))

  // Also create open positions as open trades
  const openTradesToSave: Omit<StoredTrade, "id" | "createdAt" | "updatedAt">[] = openPositions.map(pos => ({
    userId,
    accountId,
    broker,
    symbol: (pos as any).symbol || "",
    side: pos.side === "BUY" ? "LONG" : "SHORT",
    quantity: pos.quantity,
    entryPrice: pos.price,
    entryTime: pos.time.toISOString(),
    pnlPoints: 0,
    fees: 0,
    commissions: 0,
    status: "open",
    instrumentType: "future",
    currency: "USD",
    openExecutionId: pos.executionId,
  }))

  // Save trades using the authenticated server client
  const allTrades = [...tradesToSave, ...openTradesToSave]
  console.log("[Import] Saving", allTrades.length, "trades to database...")
  
  const { created: tradesCreated, updated: tradesUpdated, duplicates: tradeDuplicates } = 
    allTrades.length > 0 ? await saveTrades(allTrades, supabase) : { created: 0, updated: 0, duplicates: 0 }
  console.log("[Import] Trades created:", tradesCreated, "updated:", tradesUpdated, "duplicates:", tradeDuplicates)

  // Save import job metadata for AI context
  if (tradesCreated > 0) {
    try {
      // Calculate date range and symbols from created trades
      const closedTrades = tradesToSave.filter(t => t.status === 'closed')
      const dates = closedTrades.map(t => new Date(t.entryTime)).filter(d => !isNaN(d.getTime()))
      const symbols = Array.from(new Set(closedTrades.map(t => t.symbol)))
      const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
      
      const dateRangeStart = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null
      const dateRangeEnd = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null
      
      await supabase.from('import_jobs').insert({
        user_id: userId,
        broker,
        trades_imported: tradesCreated,
        executions_imported: executionsSaved,
        duplicates_skipped: execDuplicates + tradeDuplicates,
        date_range_start: dateRangeStart?.toISOString(),
        date_range_end: dateRangeEnd?.toISOString(),
        symbols: symbols,
        total_pnl: totalPnl
      })
    } catch (importJobError) {
      // Don't fail the import if saving metadata fails
      console.warn('[Import] Failed to save import job metadata:', importJobError)
    }
  }

  const result = {
    success: true,
    executionsImported: executionsSaved,
    tradesCreated,
    tradesUpdated,
    skippedRows: skipped + execDuplicates + tradeDuplicates,
    errors,
  }
  console.log("[Import] Final result:", result)
  return result
}

