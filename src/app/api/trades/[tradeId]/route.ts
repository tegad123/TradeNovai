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

    // Parse optional accountId from query params
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")

    // Build delete query with ownership check (RLS also enforces this)
    let query = supabase
      .from("trades")
      .delete()
      .eq("id", tradeId)
      .eq("user_id", user.id)

    if (accountId) {
      query = query.eq("account_id", accountId)
    }

    const { error, count } = await query

    if (error) {
      console.error("Error deleting trade:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Also delete any linked executions (if they exist)
    await supabase
      .from("executions")
      .delete()
      .or(`open_trade_id.eq.${tradeId},close_trade_id.eq.${tradeId}`)

    return NextResponse.json({
      success: true,
      deleted: count ?? 1,
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

