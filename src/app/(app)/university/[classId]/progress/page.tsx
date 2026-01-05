"use client"

import {
  Target,
  TrendingUp,
  BookOpen,
  FileText,
  CheckCircle2,
  Clock,
  LineChart,
  Trophy,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { useUniversityProgress } from "@/lib/hooks/useUniversityProgress"

interface PageProps {
  params: { classId: string }
}

export default function ProgressPage({ params }: PageProps) {
  const { classId } = params
  const { progress, loading: isLoading } = useUniversityProgress(classId, 'student')

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
        </div>
      </PageContainer>
    )
  }

  if (!progress) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <GlassCard className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Progress Not Available</h3>
            <p className="text-[var(--text-muted)]">
              Complete some activities to start tracking your progress
            </p>
          </GlassCard>
        </div>
      </PageContainer>
    )
  }

  const {
    lessons_completed = 0,
    total_lessons = 0,
    assignments_submitted = 0,
    total_assignments = 0,
    trade_logs_count = 0,
    average_grade,
    last_activity_at,
  } = progress

  const lessonsProgress = total_lessons > 0 ? Math.round((lessons_completed / total_lessons) * 100) : 0
  const assignmentsProgress = total_assignments > 0 ? Math.round((assignments_submitted / total_assignments) * 100) : 0
  const overallProgress = Math.round((lessonsProgress + assignmentsProgress) / 2)

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Your Progress</h1>
          <p className="text-[var(--text-muted)]">
            Track your learning journey and performance
          </p>
        </div>

        {/* Overall Progress Card */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${overallProgress * 3.52} 352`}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--theme-primary))" />
                    <stop offset="100%" stopColor="hsl(var(--theme-primary-light))" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{overallProgress}%</span>
              </div>
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">Overall Progress</h2>
              <p className="text-[var(--text-muted)] mb-4">
                {overallProgress < 25 && "You're just getting started. Keep going!"}
                {overallProgress >= 25 && overallProgress < 50 && "Good progress! You're on the right track."}
                {overallProgress >= 50 && overallProgress < 75 && "Great work! You're more than halfway there."}
                {overallProgress >= 75 && overallProgress < 100 && "Almost there! Just a little more to go."}
                {overallProgress === 100 && "Congratulations! You've completed the course!"}
              </p>
              
              {last_activity_at && (
                <p className="text-sm text-[var(--text-muted)]">
                  Last activity: {new Date(last_activity_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Lessons */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Lessons</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">{lessons_completed}</span>
                <span className="text-sm text-[var(--text-muted)]">/ {total_lessons}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                  style={{ width: `${lessonsProgress}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">{lessonsProgress}% complete</p>
            </div>
          </GlassCard>

          {/* Assignments */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Assignments</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">{assignments_submitted}</span>
                <span className="text-sm text-[var(--text-muted)]">/ {total_assignments}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all"
                  style={{ width: `${assignmentsProgress}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">{assignmentsProgress}% complete</p>
            </div>
          </GlassCard>

          {/* Trade Logs */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <LineChart className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Trade Logs</span>
            </div>
            <div className="space-y-2">
              <span className="text-2xl font-bold text-white">{trade_logs_count}</span>
              <p className="text-xs text-[var(--text-muted)]">
                {trade_logs_count === 0 && "No logs submitted yet"}
                {trade_logs_count > 0 && trade_logs_count < 5 && "Keep logging your trades!"}
                {trade_logs_count >= 5 && trade_logs_count < 10 && "Great consistency!"}
                {trade_logs_count >= 10 && "Excellent trading discipline!"}
              </p>
            </div>
          </GlassCard>

          {/* Average Grade */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--theme-primary))]/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Average Grade</span>
            </div>
            <div className="space-y-2">
              {average_grade !== null ? (
                <>
                  <span className="text-2xl font-bold text-white">{average_grade}%</span>
                  <p className="text-xs text-[var(--text-muted)]">
                    {average_grade >= 90 && "Excellent performance!"}
                    {average_grade >= 80 && average_grade < 90 && "Great work!"}
                    {average_grade >= 70 && average_grade < 80 && "Good progress"}
                    {average_grade < 70 && "Keep practicing!"}
                  </p>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-[var(--text-muted)]">--</span>
                  <p className="text-xs text-[var(--text-muted)]">No grades yet</p>
                </>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Recent Activity */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Next Steps</h2>
          
          <div className="space-y-3">
            {lessons_completed < total_lessons && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">Continue with lessons</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {total_lessons - lessons_completed} lesson{total_lessons - lessons_completed !== 1 ? 's' : ''} remaining
                  </p>
                </div>
                <Target className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
            )}

            {assignments_submitted < total_assignments && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">Complete assignments</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {total_assignments - assignments_submitted} assignment{total_assignments - assignments_submitted !== 1 ? 's' : ''} pending
                  </p>
                </div>
                <Clock className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
            )}

            {trade_logs_count < 5 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <LineChart className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">Submit more trade logs</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Build a habit of daily reflection
                  </p>
                </div>
                <TrendingUp className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
            )}

            {overallProgress === 100 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-400/10 border border-green-400/20">
                <div className="w-8 h-8 rounded-lg bg-green-400/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-green-400 font-medium">Course Completed!</p>
                  <p className="text-xs text-green-400/70">
                    You've finished all lessons and assignments
                  </p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  )
}
