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

