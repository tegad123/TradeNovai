"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  LineChart,
  Calendar,
  Upload,
  BookOpen,
  MessageSquare,
  Settings,
  Menu,
  X,
  TrendingUp
} from "lucide-react"

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Trades", href: "/trades", icon: LineChart },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Import", href: "/import", icon: Upload },
  { name: "Playbooks", href: "/playbooks", icon: BookOpen },
  { name: "AI Chat", href: "/chat", icon: MessageSquare },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Overlay - Higher z-index to cover header on mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[60]"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Fixed positioning for both mobile and desktop
          "fixed left-0 top-0 h-screen w-64 glass-sidebar transition-transform duration-300",
          // z-index: 30 on desktop (below header dropdowns), 70 on mobile (above overlay)
          "z-30 lg:z-30",
          // Mobile: overlay that slides in/out. Desktop: always visible
          isOpen ? "translate-x-0 !z-[70]" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[rgba(255,255,255,var(--glass-border-opacity))]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-theme-gradient flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TradeNova</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-88px)]">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onToggle()
                }}
                className={cn(
                  "relative flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-[rgba(var(--theme-primary-rgb),0.15)] to-[rgba(var(--theme-primary-rgb),0.05)] border border-[rgba(var(--theme-primary-rgb),0.2)] text-theme"
                    : "text-[var(--text-tertiary)] hover:text-white hover:bg-[rgba(255,255,255,var(--ui-opacity-5))]"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-theme-gradient" />
                )}
                <div className="flex items-center gap-3">
                  <Icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-[var(--theme-gradient-from)]" : "text-[var(--text-muted)] group-hover:text-white"
                  )} />
                  <span className={cn("font-medium", isActive && "text-[var(--theme-gradient-from)]")}>{item.name}</span>
                </div>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

