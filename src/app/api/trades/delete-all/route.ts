// API Route: DELETE /api/trades/delete-all
// Deletes ALL trades for the authenticated user

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

function createRouteClient() {
  const cookieStore = cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
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
          // Ignore
        }
      },
    },
  })
}

export async function DELETE(request: NextRequest) {
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

    // Delete all trades for this user
    const { error: deleteTradesError, count: tradesDeleted } = await supabase
      .from('trades')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)

    if (deleteTradesError) {
      console.error('Error deleting trades:', deleteTradesError)
      return NextResponse.json(
        { success: false, error: deleteTradesError.message },
        { status: 500 }
      )
    }

    // Also delete all executions for this user
    const { error: deleteExecsError, count: execsDeleted } = await supabase
      .from('executions')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)

    if (deleteExecsError) {
      console.error('Error deleting executions:', deleteExecsError)
      // Don't fail - trades were deleted
    }

    console.log(`[DELETE ALL] User ${user.id}: Deleted ${tradesDeleted} trades, ${execsDeleted} executions`)

    return NextResponse.json({
      success: true,
      tradesDeleted: tradesDeleted || 0,
      executionsDeleted: execsDeleted || 0
    })
  } catch (error) {
    console.error("Delete all error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

