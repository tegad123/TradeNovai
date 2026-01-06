"use client"

import { useEffect, Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import Link from "next/link"
import { GraduationCap, TrendingUp, ArrowRight } from "lucide-react"
import { GlassCard } from "@/components/glass/GlassCard"

type LoginProduct = "university" | "journal"
const LOGIN_PRODUCT_KEY = "tradenova:loginProduct"

function LoginContent() {
  const { user, loading } = useSupabaseAuthContext()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && mounted) {
      // Check stored login product
      const stored = localStorage.getItem(LOGIN_PRODUCT_KEY) as LoginProduct | null
      if (stored === "journal") {
        router.push("/dashboard")
      } else {
        router.push("/university")
      }
    }
  }, [user, loading, router, mounted])

  const handleSelectProduct = (product: LoginProduct) => {
    try {
      localStorage.setItem(LOGIN_PRODUCT_KEY, product)
    } catch {
      // ignore
    }
    
    if (product === "university") {
      router.push("/university")
    } else {
      // Journal is coming soon - still allow navigation but they'll see coming soon
      router.push("/dashboard")
    }
  }

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg-color)]">
        <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg-color)] px-4">
      <div className="w-full max-w-3xl">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-theme-gradient flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-3xl font-bold text-white">TradeNova</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to TradeNova</h1>
          <p className="text-[var(--text-muted)]">
            Choose where you want to go
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center max-w-md mx-auto">
            {error === "auth_callback_error" 
              ? "There was an error signing in. Please try again."
              : error}
          </div>
        )}

        {/* Product Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* University Card */}
          <button
            onClick={() => handleSelectProduct("university")}
            className="text-left group"
          >
            <GlassCard className="p-8 h-full hover:bg-white/[0.08] transition-all group-hover:ring-2 ring-[hsl(var(--theme-primary))]/50">
              <div className="w-16 h-16 rounded-2xl bg-theme-gradient/20 mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap className="w-8 h-8 text-[hsl(var(--theme-primary))]" />
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-[hsl(var(--theme-primary))] transition-colors">
                University
              </h2>
              <p className="text-[var(--text-muted)] mb-6">
                Learn to trade with structured courses, expert guidance, and track your progress.
              </p>

              <div className="flex items-center text-[hsl(var(--theme-primary))] font-medium">
                Continue
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </GlassCard>
          </button>

          {/* Journal Card */}
          <button
            onClick={() => handleSelectProduct("journal")}
            className="text-left group"
          >
            <GlassCard className="p-8 h-full hover:bg-white/[0.08] transition-all group-hover:ring-2 ring-white/20 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-white/10 text-xs text-[var(--text-muted)]">
                Coming Soon
              </div>
              
              <div className="w-16 h-16 rounded-2xl bg-white/10 mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2 transition-colors">
                Trading Journal
              </h2>
              <p className="text-[var(--text-muted)] mb-6">
                Track your trades, analyze performance, and improve your trading with AI insights.
              </p>

              <div className="flex items-center text-[var(--text-muted)] font-medium">
                View Preview
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </GlassCard>
          </button>
        </div>

        {/* Back to home link */}
        <div className="text-center">
          <Link 
            href="/"
            className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg-color)]">
          <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
