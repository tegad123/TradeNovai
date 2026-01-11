// API Route: DELETE /api/trades/[tradeId]
// Securely delete a trade with ownership verification

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

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
        }
      },
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tradeId: string } }
) {
  try {
    const supabase = createRouteClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase not configured" },
        { status: 500 }
      )
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    const tradeId = params.tradeId
    if (!tradeId) {
      return NextResponse.json(
        { success: false, error: "Trade ID is required" },
        { status: 400 }
      )
    }

    console.log(`[Delete Trade] Attempting to delete trade ${tradeId} for user ${user.id}`)

    // First, verify the trade exists and belongs to the user
    const { data: existingTrade, error: fetchError } = await supabase
      .from("trades")
      .select("id, user_id, symbol")
      .eq("id", tradeId)
      .single()

    if (fetchError) {
      console.error("[Delete Trade] Error fetching trade:", fetchError)
      return NextResponse.json(
        { success: false, error: `Trade not found: ${fetchError.message}` },
        { status: 404 }
      )
    }

    if (!existingTrade) {
      return NextResponse.json(
        { success: false, error: "Trade not found" },
        { status: 404 }
      )
    }

    if (existingTrade.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to delete this trade" },
        { status: 403 }
      )
    }

    console.log(`[Delete Trade] Found trade: ${existingTrade.symbol}, proceeding with delete`)

    // Parse optional accountId from query params
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")

    // Build delete query
    let query = supabase
      .from("trades")
      .delete()
      .eq("id", tradeId)
      .eq("user_id", user.id)

    if (accountId) {
      query = query.eq("account_id", accountId)
    }

    const { error } = await query

    if (error) {
      console.error("[Delete Trade] Error deleting trade:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[Delete Trade] Successfully deleted trade ${tradeId}`)

    // Also delete any linked executions (if they exist)
    await supabase
      .from("executions")
      .delete()
      .or(`open_trade_id.eq.${tradeId},close_trade_id.eq.${tradeId}`)

    return NextResponse.json({
      success: true,
      deleted: 1,
    })
  } catch (error) {
    console.error("Delete trade error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

