"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react"
import { useSupabaseAuth } from "@/lib/hooks/useSupabaseAuth"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"

type AuthMode = 'signin' | 'signup'

export default function InstructorLoginPage() {
  const router = useRouter()
  const { user } = useSupabaseAuthContext()
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    authError, 
    clearError 
  } = useSupabaseAuth()
  
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // If user is already logged in, redirect to courses
  useEffect(() => {
    if (user) {
      localStorage.setItem('tradenova:universityRole', 'instructor')
      // Redirect to the authenticated courses page in (app) group
      router.push('/university/courses')
    }
  }, [user, router])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    clearError()
    
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    if (mode === 'signup') {
      const result = await signUpWithEmail(email, password, 'instructor', fullName || undefined)
      if (result.success) {
        setSuccessMessage("Account created! Please check your email to confirm your account.")
        setMode('signin')
      } else {
        setError(result.error || "Failed to create account")
      }
    } else {
      const result = await signInWithEmail(email, password)
      if (result.success) {
        localStorage.setItem('tradenova:universityRole', 'instructor')
        router.push('/university/courses')
      } else {
        setError(result.error || "Failed to sign in")
      }
    }

    setLoading(false)
  }

  const handleGoogleAuth = () => {
    // Store role before OAuth redirect
    localStorage.setItem('tradenova:universityRole', 'instructor')
    signInWithGoogle({ 
      next: '/university/courses',
      role: 'instructor'
    })
  }

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError(null)
    setSuccessMessage(null)
    clearError()
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link 
          href="/university"
          className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to role selection
        </Link>

        <GlassCard className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 mx-auto mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {mode === 'signin' ? 'Instructor Sign In' : 'Create Instructor Account'}
            </h1>
            <p className="text-[var(--text-muted)]">
              {mode === 'signin' 
                ? 'Sign in to manage your courses' 
                : 'Create an account to start teaching'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {(error || authError) && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error || authError}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400">
              {successMessage}
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-sm text-[var(--text-muted)]">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm text-[var(--text-muted)]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-[var(--text-muted)]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="glass-theme"
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--glass-bg)] px-2 text-[var(--text-muted)]">or</span>
            </div>
          </div>

          {/* Google Auth */}
          <Button
            type="button"
            variant="glass"
            className="w-full"
            onClick={handleGoogleAuth}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          {/* Toggle Mode */}
          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-[hsl(var(--theme-primary))] hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-[hsl(var(--theme-primary))] hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </GlassCard>
      </div>
    </div>
  )
}

