import { createBrowserClient, SupabaseClient } from "@supabase/ssr"

let supabaseClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  // Check if credentials are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase credentials not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    )
  }

  // Reuse client if already created
  if (supabaseClient) {
    return supabaseClient
  }

  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
}

// Safe version that returns null if not configured
export function createClientSafe(): SupabaseClient | null {
  try {
    return createClient()
  } catch {
    return null
  }
}

