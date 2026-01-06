"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClientSafe } from "@/lib/supabase/browser"
import { User, Session, AuthChangeEvent, AuthError } from "@supabase/supabase-js"

export type UniversityRole = 'student' | 'instructor'

export interface AuthResult {
  success: boolean
  error?: string
  user?: User
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  
  // Create supabase client once - may be null if not configured
  const supabase = useMemo(() => createClientSafe(), [])

  useEffect(() => {
    // If Supabase is not configured, set loading to false and return
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error("Error getting session:", error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Email/Password Sign Up
  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    role: UniversityRole,
    fullName?: string
  ): Promise<AuthResult> => {
    if (!supabase) {
      return { success: false, error: "Supabase is not configured" }
    }
    
    setAuthError(null)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          university_role: role,
          full_name: fullName || email.split('@')[0],
        },
      },
    })
    
    if (error) {
      setAuthError(error.message)
      return { success: false, error: error.message }
    }
    
    // Store role in localStorage for session
    localStorage.setItem('tradenova:universityRole', role)
    
    return { success: true, user: data.user ?? undefined }
  }, [supabase])

  // Email/Password Sign In
  const signInWithEmail = useCallback(async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    if (!supabase) {
      return { success: false, error: "Supabase is not configured" }
    }
    
    setAuthError(null)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      setAuthError(error.message)
      return { success: false, error: error.message }
    }
    
    return { success: true, user: data.user ?? undefined }
  }, [supabase])

  // Google OAuth Sign In (with role parameter for University)
  const signInWithGoogle = useCallback(async (options?: { next?: string; role?: UniversityRole }) => {
    if (!supabase) {
      console.error("Supabase is not configured")
      return
    }
    
    // Store role in localStorage before redirect so we can use it after callback
    if (options?.role) {
      localStorage.setItem('tradenova:universityRole', options.role)
    }
    
    const next = options?.next && options.next.startsWith("/") ? options.next : "/university"
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      console.error("Error signing in with Google:", error)
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    if (!supabase) {
      console.error("Supabase is not configured")
      return
    }
    
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error signing out:", error)
    }
  }, [supabase])

  // Clear auth error
  const clearError = useCallback(() => {
    setAuthError(null)
  }, [])

  return {
    user,
    session,
    loading,
    authError,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    clearError,
  }
}

