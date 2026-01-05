"use client"

import { useState } from "react"
import { useUniversity, type UniversityUser } from "@/lib/contexts/UniversityContext"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  User, 
  ShieldCheck, 
  LogOut,
  ChevronUp,
  ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"

const DEMO_STUDENTS: UniversityUser[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Alex (Pro Student)',
    email: 'alex@demo.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Sarah (Newbie Student)',
    email: 'sarah@demo.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  }
]

export function DemoUserSwitcher() {
  const { currentUser, impersonateUser, isImpersonating, currentRole } = useUniversity()
  const [isOpen, setIsOpen] = useState(false)

  if (!currentUser) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <div className={cn(
        "mb-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-300",
        isOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 border-none"
      )}>
        <div className="p-3 border-b border-white/10 bg-white/5">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Switch Perspective (Demo)
          </p>
        </div>
        
        <div className="p-2 space-y-1">
          {/* Back to real user */}
          {isImpersonating && (
            <button
              onClick={() => {
                impersonateUser(null)
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-theme-gradient flex items-center justify-center text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">Back to Instructor</p>
                <p className="text-[10px] text-green-400">Your Real Account</p>
              </div>
              <LogOut className="w-4 h-4 text-[var(--text-muted)] group-hover:text-white" />
            </button>
          )}

          {/* Demo students */}
          {DEMO_STUDENTS.map(student => (
            <button
              key={student.id}
              onClick={() => {
                impersonateUser(student)
                setIsOpen(false)
              }}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left group",
                currentUser.id === student.id ? "bg-white/10" : "hover:bg-white/5"
              )}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/10">
                <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{student.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Demo Student</p>
              </div>
              {currentUser.id === student.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--theme-primary))]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="glass-theme"
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full shadow-2xl h-12 px-6",
          isImpersonating && "bg-orange-500/20 border-orange-500/50"
        )}
      >
        {isImpersonating ? (
          <>
            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20 mr-2">
              <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-medium mr-2">Viewing as {currentUser.name.split(' ')[0]}</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
          </>
        ) : (
          <>
            <User className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Demo Mode</span>
            <ChevronUp className={cn("w-4 h-4 transition-transform ml-2", isOpen && "rotate-180")} />
          </>
        )}
      </Button>
    </div>
  )
}

