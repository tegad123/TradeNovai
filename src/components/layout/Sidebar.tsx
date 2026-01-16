"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  LineChart,
  Calendar,
  BookOpen,
  MessageSquare,
  Settings,
  TrendingUp,
  GraduationCap,
  Home,
  FolderOpen,
  ClipboardList,
  FileText,
  BarChart3,
  Users,
  CheckSquare,
  ChevronDown,
} from "lucide-react"
import { useUniversity } from "@/lib/contexts/UniversityContext"

// Trade Journal navigation items
const journalNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Trades", href: "/trades", icon: LineChart },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Playbooks", href: "/playbooks", icon: BookOpen },
  { name: "AI Chat", href: "/chat", icon: MessageSquare },
  { name: "Settings", href: "/settings", icon: Settings },
]

// University navigation items - Student
const universityStudentNavItems = [
  { name: "Home", href: "/university/home", icon: Home },
  { name: "Modules", href: "/university/modules", icon: FolderOpen },
  { name: "Assignments", href: "/university/assignments", icon: ClipboardList },
  { name: "Quizzes", href: "/university/quizzes", icon: CheckSquare },
  { name: "Messages", href: "/university/messages", icon: MessageSquare },
  { name: "Trade Logs", href: "/university/trade-logs", icon: FileText },
  { name: "Progress", href: "/university/progress", icon: BarChart3 },
  { name: "Settings", href: "/university/student/settings", icon: Settings, absolute: true },
]

// University navigation items - Instructor
const universityInstructorNavItems = [
  { name: "Dashboard", href: "/university/instructor", icon: LayoutDashboard },
  { name: "Modules", href: "/university/modules", icon: FolderOpen },
  { name: "Assignments", href: "/university/assignments", icon: ClipboardList },
  { name: "Quizzes", href: "/university/quizzes", icon: ClipboardList },
  { name: "Students", href: "/university/students", icon: Users },
  { name: "Messages", href: "/university/messages", icon: MessageSquare },
  { name: "Reviews", href: "/university/reviews", icon: CheckSquare },
  { name: "Settings", href: "/university/instructor/settings", icon: Settings, absolute: true },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { mode, setMode, currentRole, currentCourse } = useUniversity()

  // Get navigation items based on mode and role
  const navigationItems = mode === 'university'
    ? currentRole === 'instructor'
      ? universityInstructorNavItems
      : universityStudentNavItems
    : journalNavItems

  // Build university nav links with course ID if available
  const getNavHref = (href: string, absolute?: boolean) => {
    // Absolute links (like settings) should not be modified
    if (absolute) return href
    
    if (mode === 'university' && currentCourse) {
      // Replace /university/ with /university/[classId]/
      return href.replace('/university/', `/university/${currentCourse.id}/`)
    }
    return href
  }

  const homeHref = mode === 'university' ? '/university' : '/dashboard'

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
          "fixed left-0 top-0 h-screen w-64 glass-sidebar transition-transform duration-300 flex flex-col",
          // z-index: 30 on desktop (below header dropdowns), 70 on mobile (above overlay)
          "z-30 lg:z-30",
          // Mobile: overlay that slides in/out. Desktop: always visible
          isOpen ? "translate-x-0 !z-[70]" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[rgba(255,255,255,var(--glass-border-opacity))]">
          <Link href={homeHref} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-theme-gradient flex items-center justify-center">
              {mode === 'university' ? (
                <GraduationCap className="w-5 h-5 text-white" />
              ) : (
                <TrendingUp className="w-5 h-5 text-white" />
              )}
            </div>
            <span className="text-xl font-bold text-white">
              {mode === 'university' ? 'University' : 'TradeNova'}
            </span>
          </Link>
        </div>

        {/* Mode Switcher */}
        <div className="p-4 border-b border-[rgba(255,255,255,var(--glass-border-opacity))]">
          <div className="flex rounded-xl bg-white/5 p-1">
            <button
              onClick={() => setMode('journal')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                mode === 'journal'
                  ? "bg-theme-gradient text-white shadow-lg"
                  : "text-[var(--text-muted)] hover:text-white"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Journal</span>
            </button>
            <button
              onClick={() => setMode('university')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                mode === 'university'
                  ? "bg-theme-gradient text-white shadow-lg"
                  : "text-[var(--text-muted)] hover:text-white"
              )}
            >
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">University</span>
            </button>
          </div>
        </div>

        {/* Course Selector (University mode only) */}
        {mode === 'university' && currentCourse && (
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,var(--glass-border-opacity))]">
            <Link 
              href="/university"
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-muted)]">Current Class</p>
                <p className="text-sm font-medium text-white truncate">{currentCourse.name}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* University mode: Show message if no course selected */}
          {mode === 'university' && !currentCourse && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[var(--text-muted)] mb-2">No course selected</p>
              <Link 
                href="/university"
                className="text-sm text-[hsl(var(--theme-primary))] hover:underline"
              >
                Select or join a course
              </Link>
            </div>
          )}
          
          {/* Show navigation only if not in university mode, or if a course is selected */}
          {(mode !== 'university' || currentCourse) && navigationItems.map((item) => {
            const Icon = item.icon
            const href = getNavHref(item.href, (item as any).absolute)
            const isActive = pathname === href || 
              (href !== homeHref && pathname.startsWith(href)) ||
              (mode === 'university' && pathname.includes(item.href.split('/').pop() || ''))

            return (
              <Link
                key={item.name}
                href={href}
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

        {/* Intentionally no dev-only role switching in launch builds */}
      </aside>
    </>
  )
}

