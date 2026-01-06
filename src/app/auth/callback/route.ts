import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams } = url
  const code = searchParams.get("code")
  const nextRaw = searchParams.get("next") ?? "/university"
  const next = nextRaw.startsWith("/") ? nextRaw : "/university"

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Prefer forwarded headers (Render/Proxy) over request.url's origin to avoid redirecting to localhost.
      const xfHost = request.headers.get("x-forwarded-host")
      const host = xfHost || request.headers.get("host") || url.host
      const xfProto = request.headers.get("x-forwarded-proto")
      const proto = xfProto || url.protocol.replace(":", "") || "https"
      const target = `${proto}://${host}${next}`
      return NextResponse.redirect(target)
    }
  }

  // Return the user to an error page with instructions
  const fallbackHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host
  const fallbackProto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https"
  return NextResponse.redirect(`${fallbackProto}://${fallbackHost}/login?error=auth_callback_error`)
}

