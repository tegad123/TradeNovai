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

      // Return small HTML that logs the redirect decision to the local debug ingest (client-side),
      // then navigates to the computed target.
      const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
  <body>
    <script>
      try {
        fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          location:'auth/callback/route.ts:clientRedirect',
          message:'oauth callback redirect decision',
          data:{
            href: window.location.href,
            serverRequestUrl: ${JSON.stringify(request.url)},
            urlHost: ${JSON.stringify(url.host)},
            headerHost: ${JSON.stringify(request.headers.get("host"))},
            xForwardedHost: ${JSON.stringify(xfHost)},
            xForwardedProto: ${JSON.stringify(xfProto)},
            computedTarget: ${JSON.stringify(target)},
            next: ${JSON.stringify(next)}
          },
          timestamp: Date.now(),
          sessionId:'debug-session',
          runId:'oauth-domain-v1',
          hypothesisId:'O2'
        })}).catch(function(){});
      } catch (e) {}
      window.location.replace(${JSON.stringify(target)});
    </script>
  </body>
</html>`

      return new NextResponse(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    }
  }

  // Return the user to an error page with instructions
  const fallbackHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host
  const fallbackProto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https"
  return NextResponse.redirect(`${fallbackProto}://${fallbackHost}/login?error=auth_callback_error`)
}

