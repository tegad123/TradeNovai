"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle } from "lucide-react"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"

export type UniversityRole = 'student' | 'instructor'

interface UniversityRoleGuardProps {
  children: React.ReactNode
  allowedRoles: UniversityRole[]
  redirectTo?: string
}

/**
 * UniversityRoleGuard - Protects routes based on user's university role
 * 
 * Usage:
 * <UniversityRoleGuard allowedRoles={['student']}>
 *   <StudentOnlyContent />
 * </UniversityRoleGuard>
 * 
 * <UniversityRoleGuard allowedRoles={['instructor']}>
 *   <InstructorOnlyContent />
 * </UniversityRoleGuard>
 */
export function UniversityRoleGuard({ 
  children, 
  allowedRoles,
  redirectTo = '/university'
}: UniversityRoleGuardProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useSupabaseAuthContext()
  const [currentRole, setCurrentRole] = useState<UniversityRole | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (authLoading) return

    // Check if user is authenticated
    if (!user) {
      router.push(redirectTo)
      return
    }

    // Get role from localStorage
    const storedRole = localStorage.getItem('tradenova:universityRole') as UniversityRole | null
    setCurrentRole(storedRole)
    setChecking(false)
  }, [user, authLoading, router, redirectTo])

  // Show loading while checking auth and role
  if (authLoading || checking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
      </div>
    )
  }

  // User is not authenticated
  if (!user) {
    return null // Router will redirect
  }

  // User has no role set
  if (!currentRole) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Role Not Selected</h2>
          <p className="text-[var(--text-muted)] mb-6">
            Please select your role to continue.
          </p>
          <Button
            variant="glass-theme"
            onClick={() => router.push('/university')}
          >
            Select Role
          </Button>
        </GlassCard>
      </div>
    )
  }

  // User's role is not allowed for this route
  if (!allowedRoles.includes(currentRole)) {
    const roleLabel = currentRole === 'student' ? 'Student' : 'Instructor'
    const requiredLabel = allowedRoles.includes('instructor') ? 'instructors' : 'students'
    
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-[var(--text-muted)] mb-6">
            You&apos;re currently signed in as a <strong>{roleLabel}</strong>.
            This area is only accessible to {requiredLabel}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="glass"
              onClick={() => router.back()}
            >
              Go Back
            </Button>
            <Button
              variant="glass-theme"
              onClick={() => {
                // Allow switching roles
                router.push('/university')
              }}
            >
              Switch Role
            </Button>
          </div>
        </GlassCard>
      </div>
    )
  }

  // User has an allowed role - render children
  return <>{children}</>
}

/**
 * Hook to get the current university role
 */
export function useUniversityRole(): {
  role: UniversityRole | null
  setRole: (role: UniversityRole) => void
  clearRole: () => void
  isStudent: boolean
  isInstructor: boolean
} {
  const [role, setRoleState] = useState<UniversityRole | null>(null)

  useEffect(() => {
    const storedRole = localStorage.getItem('tradenova:universityRole') as UniversityRole | null
    setRoleState(storedRole)
  }, [])

  const setRole = (newRole: UniversityRole) => {
    localStorage.setItem('tradenova:universityRole', newRole)
    setRoleState(newRole)
  }

  const clearRole = () => {
    localStorage.removeItem('tradenova:universityRole')
    setRoleState(null)
  }

  return {
    role,
    setRole,
    clearRole,
    isStudent: role === 'student',
    isInstructor: role === 'instructor',
  }
}

export default UniversityRoleGuard

