"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { useUniversity } from "@/lib/contexts/UniversityContext"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"

// Map routes to titles
const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/trades": "Trades",
  "/calendar": "Calendar",
  "/import": "Import Trades",
  "/playbooks": "Playbooks",
  "/chat": "AI Chat",
  "/settings": "Settings",
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useSupabaseAuthContext()
  const { mode } = useUniversity()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // #region agent log
    try {
      const cssVarBg = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg-color').trim()
      const sheets = Array.from(document.styleSheets || [])
      const sheetHrefs = sheets
        .map((s) => (s as CSSStyleSheet).href)
        .filter((h): h is string => typeof h === 'string')
        .slice(0, 5)

      const probe = document.createElement('div')
      probe.className = 'hidden bg-red-500'
      document.body.appendChild(probe)
      const probeBg = getComputedStyle(probe).backgroundColor
      probe.remove()

      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'(app)/layout.tsx:cssProbe',message:'css probe',data:{href:window.location.href,host:window.location.host,pathname,mode,hasUser:!!user,styleSheetsCount:sheets.length,firstSheetHrefs:sheetHrefs,cssVarBg,tailwindProbeBg:probeBg},timestamp:Date.now(),sessionId:'debug-session',runId:'ui-css-v1',hypothesisId:'U1'})}).catch(()=>{});
    } catch (e) {
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'(app)/layout.tsx:cssProbe:catch',message:'css probe threw',data:{pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'ui-css-v1',hypothesisId:'U1'})}).catch(()=>{});
    }
    // #endregion
  }, [pathname, mode, user])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push("/")
    }
  }, [user, loading, router, pathname])

  // Get title from pathname
  const title = Object.entries(routeTitles).find(([path]) => 
    pathname === path || pathname.startsWith(path + "/")
  )?.[1] || "Dashboard"

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Fixed column on desktop, overlay on mobile */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Right column: Header + Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Header - Sticky within the right column */}
        <Header title={title} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Demo Switcher - Only in University mode */}
    </div>
  )
}

