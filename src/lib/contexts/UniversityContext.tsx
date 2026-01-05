"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"
import { useSupabaseAuthContext } from "./SupabaseAuthContext"
import {
  getUserCourses,
  getCourseById,
  joinCourse as joinCourseUtil,
  getUserRoleInCourse,
  getOrCreateProfile,
  createCourse as createCourseUtil,
  type Course
} from "@/lib/supabase/universityUtils"

// Types
export type UserRole = 'student' | 'instructor'

export interface UniversityUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export interface UniversityContextType {
  mode: 'journal' | 'university'
  setMode: (mode: 'journal' | 'university') => void
  currentUser: UniversityUser | null
  impersonateUser: (user: UniversityUser | null) => void
  isImpersonating: boolean
  currentRole: UserRole
  setCurrentRole: (role: UserRole) => void
  courses: Course[]
  currentCourse: Course | null
  setCurrentCourse: (course: Course | null) => void
  selectCourse: (courseId: string) => Promise<void>
  joinCourse: (accessCode: string) => Promise<Course | null>
  createCourse: (data: { name: string; code: string; description?: string; cover_image_url?: string }) => Promise<Course | null>
  refreshCourses: () => Promise<void>
  isLoading: boolean
}

const LOCAL_STORAGE_KEY = "university-state"

interface StoredState {
  mode: 'journal' | 'university'
  currentRole: UserRole
  currentCourseId: string | null
}

const defaultState: StoredState = {
  mode: 'journal',
  currentRole: 'student',
  currentCourseId: null,
}

const UniversityContext = createContext<UniversityContextType | undefined>(undefined)

export function UniversityProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useSupabaseAuthContext()
  
  const [mode, setModeState] = useState<'journal' | 'university'>('journal')
  const [currentRole, setCurrentRoleState] = useState<UserRole>('student')
  const [courses, setCourses] = useState<Course[]>([])
  const [currentCourse, setCurrentCourseState] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [impersonatedUser, setImpersonatedUser] = useState<UniversityUser | null>(null)

  // Get current university user from Supabase auth user
  const realUser: UniversityUser | null = user ? {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatarUrl: user.user_metadata?.avatar_url
  } : null

  // The user actually used by the app (real or impersonated)
  const currentUser = impersonatedUser || realUser

  // Load state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) {
        const state: StoredState = JSON.parse(stored)
        setModeState(state.mode)
        setCurrentRoleState(state.currentRole)
        // Course will be loaded from Supabase based on stored ID
      }
    } catch (e) {
      console.error("Failed to load university state:", e)
    }
  }, [])

  // Load courses from Supabase when user is authenticated
  useEffect(() => {
    async function loadCourses() {
      if (authLoading) return
      
      if (!user) {
        setCourses([])
        setCurrentCourseState(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        
        // Ensure user profile exists in Supabase
        await getOrCreateProfile(
          user.id,
          user.user_metadata?.full_name,
          user.user_metadata?.avatar_url
        )
        
        // Fetch user's courses
        const userCourses = await getUserCourses(user.id)
        setCourses(userCourses)

        // Restore current course from localStorage
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (stored) {
          const state: StoredState = JSON.parse(stored)
          if (state.currentCourseId) {
            const course = userCourses.find(c => c.id === state.currentCourseId)
            if (course) {
              setCurrentCourseState(course)
              // Also load the role for this course
              const role = await getUserRoleInCourse(user.id, course.id)
              if (role) {
                setCurrentRoleState(role)
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to load university courses:", e)
      } finally {
        setIsLoading(false)
      }
    }

    loadCourses()
  }, [user, authLoading])

  // Save state to localStorage
  const saveState = useCallback((updates: Partial<StoredState>) => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      const current: StoredState = stored ? JSON.parse(stored) : defaultState
      const newState = { ...current, ...updates }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState))
    } catch (e) {
      console.error("Failed to save university state:", e)
    }
  }, [])

  // Set mode
  const setMode = useCallback((newMode: 'journal' | 'university') => {
    setModeState(newMode)
    saveState({ mode: newMode })
  }, [saveState])

  // Set role
  const setCurrentRole = useCallback((role: UserRole) => {
    setCurrentRoleState(role)
    saveState({ currentRole: role })
  }, [saveState])

  // Set current course
  const setCurrentCourse = useCallback(async (course: Course | null) => {
    setCurrentCourseState(course)
    saveState({ currentCourseId: course?.id || null })
    
    // Update role when course changes
    if (course && user) {
      const role = await getUserRoleInCourse(user.id, course.id)
      if (role) {
        setCurrentRoleState(role)
        saveState({ currentRole: role })
      }
    }
  }, [saveState, user])

  // Select course by ID
  const selectCourse = useCallback(async (courseId: string) => {
    const course = await getCourseById(courseId)
    if (course) {
      await setCurrentCourse(course)
    }
  }, [setCurrentCourse])

  // Join a course with access code
  const joinCourse = useCallback(async (accessCode: string): Promise<boolean> => {
    if (!user) return false
    
    const result = await joinCourseUtil(user.id, accessCode)
    
    if (result.success && result.course) {
      // Refresh courses list
      const userCourses = await getUserCourses(user.id)
      setCourses(userCourses)
      
      // Set as current course
      await setCurrentCourse(result.course)
      
      return result.course
    }

    return null
  }, [user, setCurrentCourse])

  const createCourse = useCallback(async (data: { name: string; code: string; description?: string; cover_image_url?: string }): Promise<Course | null> => {
    if (!user) return null
    const created = await createCourseUtil(user.id, {
      name: data.name,
      code: data.code,
      description: data.description,
      cover_image_url: data.cover_image_url,
    })
    if (!created) return null

    const userCourses = await getUserCourses(user.id)
    setCourses(userCourses)
    await setCurrentCourse(created)
    return created
  }, [user, setCurrentCourse])

  // Refresh courses
  const refreshCourses = useCallback(async () => {
    if (!user) return
    
    const userCourses = await getUserCourses(user.id)
    setCourses(userCourses)
  }, [user])

  const impersonateUser = useCallback(async (demoUser: UniversityUser | null) => {
    setImpersonatedUser(demoUser)
    if (demoUser && currentCourse) {
      const role = await getUserRoleInCourse(demoUser.id, currentCourse.id)
      setCurrentRoleState(role || 'student')
    } else if (!demoUser && user && currentCourse) {
      const role = await getUserRoleInCourse(user.id, currentCourse.id)
      setCurrentRoleState(role || 'student')
    }
  }, [user, currentCourse])

  return (
    <UniversityContext.Provider
      value={{
        mode,
        setMode,
        currentUser,
        impersonateUser,
        isImpersonating: !!impersonatedUser,
        currentRole,
        setCurrentRole,
        courses,
        currentCourse,
        setCurrentCourse,
        selectCourse,
        joinCourse,
        createCourse,
        refreshCourses,
        isLoading,
      }}
    >
      {children}
    </UniversityContext.Provider>
  )
}

export function useUniversity() {
  const context = useContext(UniversityContext)
  if (context === undefined) {
    throw new Error("useUniversity must be used within a UniversityProvider")
  }
  return context
}
