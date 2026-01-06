"use client"

import { createContext, useContext, ReactNode } from "react"
import { useSupabaseAuth } from "@/lib/hooks/useSupabaseAuth"
import { User, Session } from "@supabase/supabase-js"

interface SupabaseAuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: (options?: { next?: string }) => Promise<void>
  signOut: () => Promise<void>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseAuth()

  return (
    <SupabaseAuthContext.Provider value={auth}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export function useSupabaseAuthContext() {
  const context = useContext(SupabaseAuthContext)
  if (context === undefined) {
    throw new Error("useSupabaseAuthContext must be used within a SupabaseAuthProvider")
  }
  return context
}

