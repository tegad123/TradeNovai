"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  GraduationCap,
  Users,
  BookOpen,
  ArrowRight,
} from "lucide-react"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"

export default function UniversityRoleChooserPage() {
  const router = useRouter()
  const { user, loading } = useSupabaseAuthContext()

  // If user is already logged in with a role set, redirect to courses
  useEffect(() => {
    if (!loading && user) {
      const savedRole = localStorage.getItem('tradenova:universityRole')
      if (savedRole) {
        // User has a role, redirect to the authenticated courses page
        router.push('/university/courses')
      }
    }
  }, [user, loading, router])

  const handleSelectRole = (role: 'student' | 'instructor') => {
    // Store the intended role temporarily
    localStorage.setItem('tradenova:intendedRole', role)
    router.push(`/university/${role}/login`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-theme-gradient mx-auto mb-6 flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">TradeNova University</h1>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            Master the art of trading with structured courses and expert guidance
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Student Card */}
          <button
            onClick={() => handleSelectRole('student')}
            className="text-left group"
          >
            <GlassCard className="p-8 h-full hover:bg-white/[0.08] transition-all group-hover:ring-2 ring-[hsl(var(--theme-primary))]/50">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-blue-400" />
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-[hsl(var(--theme-primary))] transition-colors">
                Continue as Student
              </h2>
              <p className="text-[var(--text-muted)] mb-6">
                Join courses, complete lessons, submit assignments, and track your progress.
              </p>

              <div className="flex items-center text-[hsl(var(--theme-primary))] font-medium">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </GlassCard>
          </button>

          {/* Instructor Card */}
          <button
            onClick={() => handleSelectRole('instructor')}
            className="text-left group"
          >
            <GlassCard className="p-8 h-full hover:bg-white/[0.08] transition-all group-hover:ring-2 ring-[hsl(var(--theme-primary))]/50">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-[hsl(var(--theme-primary))] transition-colors">
                Continue as Instructor
              </h2>
              <p className="text-[var(--text-muted)] mb-6">
                Create courses, upload content, manage students, and grade assignments.
              </p>

              <div className="flex items-center text-[hsl(var(--theme-primary))] font-medium">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </GlassCard>
          </button>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link 
            href="/"
            className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
          >
            ← Back to TradeNova
          </Link>
        </div>
      </div>
    </div>
  )
}

