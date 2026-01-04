"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Bell,
  Settings,
  User,
  LogOut,
  TrendingUp,
  LayoutDashboard,
  Menu,
  X
} from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"

// Mobile navigation items
const mobileNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Trades", href: "/trades", icon: TrendingUp },
  { name: "Calendar", href: "/calendar", icon: LayoutDashboard },
  { name: "Import", href: "/import", icon: LayoutDashboard },
  { name: "Playbooks", href: "/playbooks", icon: LayoutDashboard },
  { name: "Chat", href: "/chat", icon: LayoutDashboard },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface HeaderProps {
  title: string
  onMenuClick?: () => void
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 px-4 sm:px-6 pt-4">
        {/* Navigation Bar */}
        <div className="glass-header px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden flex-shrink-0 text-[var(--text-tertiary)] hover:text-white hover:bg-[rgba(255,255,255,var(--ui-opacity-10))]"
                onClick={onMenuClick}
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Title */}
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-white whitespace-nowrap flex-shrink-0">
                {title}
              </h1>
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
              {/* Notifications Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="glass-circle" size="icon-lg" className="relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-theme-gradient rounded-full border-2" style={{ borderColor: 'var(--theme-bg-color)' }} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[85vw] sm:w-80 glass-dropdown border-[rgba(255,255,255,var(--glass-border-opacity))]" align="end" sideOffset={12}>
                  <DropdownMenuLabel className="text-[var(--text-tertiary)]">Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[rgba(255,255,255,var(--ui-opacity-10))]" />
                  <DropdownMenuItem className="text-[var(--text-secondary)] focus:bg-[rgba(255,255,255,var(--ui-opacity-10))] focus:text-white cursor-pointer flex-col items-start">
                    <span className="font-medium">No new notifications</span>
                    <span className="text-xs text-[var(--text-muted)]">Check back later</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="ml-2 border-2 border-[rgba(255,255,255,var(--glass-border-opacity))] hover:border-[rgba(255,255,255,var(--ui-opacity-20))] transition-colors cursor-pointer">
                    {user?.photoURL ? (
                      <AvatarImage
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                      />
                    ) : null}
                    <AvatarFallback className="bg-theme-gradient text-white">
                      {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-dropdown border-[rgba(255,255,255,var(--glass-border-opacity))]" align="end" sideOffset={12}>
                  <DropdownMenuLabel className="text-[var(--text-tertiary)]">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-white">{user?.displayName || "User"}</p>
                      <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[rgba(255,255,255,var(--ui-opacity-10))]" />
                  <DropdownMenuItem className="text-[var(--text-secondary)] focus:bg-[rgba(255,255,255,var(--ui-opacity-10))] focus:text-white cursor-pointer" asChild>
                    <Link href="/settings">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-[var(--text-secondary)] focus:bg-[rgba(255,255,255,var(--ui-opacity-10))] focus:text-white cursor-pointer" asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[rgba(255,255,255,var(--ui-opacity-10))]" />
                  <DropdownMenuItem
                    className="text-red-400 focus:bg-[rgba(255,255,255,var(--ui-opacity-10))] focus:text-red-400 cursor-pointer"
                    onClick={signOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Drawer Menu - Mobile only (higher than sidebar overlay) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <div className="absolute left-0 top-0 h-full w-72 glass-sidebar animate-slide-in">
              {/* Header */}
              <div className="p-5 border-b border-[rgba(255,255,255,var(--glass-border-opacity))] flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                  <div className="w-10 h-10 rounded-xl bg-theme-gradient flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">TradeNova</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[var(--text-tertiary)] hover:text-white hover:bg-[rgba(255,255,255,var(--ui-opacity-10))]"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Navigation Links */}
              <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-88px)]">
                {mobileNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                        isActive
                          ? "glass text-white"
                          : "text-[var(--text-tertiary)] hover:text-white hover:bg-[rgba(255,255,255,var(--ui-opacity-10))]"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 transition-colors",
                        isActive ? "text-white" : "text-[var(--text-muted)]"
                      )} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        )}
      </header>
    </TooltipProvider>
  )
}

