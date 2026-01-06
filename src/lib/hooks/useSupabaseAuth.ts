"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClientSafe } from "@/lib/supabase/browser"
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js"

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
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

  const signInWithGoogle = useCallback(async (options?: { next?: string }) => {
    if (!supabase) {
      console.error("Supabase is not configured")
      return
    }
    
    const next = options?.next && options.next.startsWith("/") ? options.next : "/university"
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSupabaseAuth.ts:signInWithGoogle',message:'starting google oauth',data:{href:window.location.href,origin:window.location.origin,next},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-domain-v1',hypothesisId:'O1'})}).catch(()=>{});
    // #endregion
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

  return {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
  }
}

