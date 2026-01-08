import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams } = url
  const code = searchParams.get("code")
  const nextRaw = searchParams.get("next") ?? "/university"
  const next = nextRaw.startsWith("/") ? nextRaw : "/university"

  // Determine the correct origin to redirect to
  // In development (localhost), use the URL's origin directly
  // In production (behind proxy), use forwarded headers
  const getRedirectOrigin = () => {
    const host = request.headers.get("host") || url.host
    
    // If we're on localhost, use the request URL directly
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return url.origin
    }
    
    // Otherwise, prefer forwarded headers (for Render/proxy)
    const xfHost = request.headers.get("x-forwarded-host") || host
    const xfProto = request.headers.get("x-forwarded-proto") || "https"
    return `${xfProto}://${xfHost}`
  }

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const origin = getRedirectOrigin()
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  const origin = getRedirectOrigin()
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}

