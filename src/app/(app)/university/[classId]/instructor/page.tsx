"use client"
import { useRouter } from "next/navigation"
import {
  Users,
  FileText,
  LineChart,
  MessageSquare,
  TrendingUp,
  Clock,
  ChevronRight,
  Loader2,
  GraduationCap,
} from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"
import { useUniversity } from "@/lib/contexts/UniversityContext"
import { useUniversityProgress } from "@/lib/hooks/useUniversityProgress"
import { useUniversityAssignments } from "@/lib/hooks/useUniversityAssignments"
import { useUniversityTradeLogs } from "@/lib/hooks/useUniversityTradeLogs"

interface PageProps {
  params: { classId: string }
}

export default function InstructorDashboardPage({ params }: PageProps) {
  const { classId } = params
  const router = useRouter()
  const { currentRole } = useUniversity()
  const { allStudentsProgress, loading: progressLoading } = useUniversityProgress(classId, currentRole)
  const { submissions, loading: assignmentsLoading } = useUniversityAssignments(classId, currentRole)
  const { tradeLogs, isLoading: logsLoading } = useUniversityTradeLogs(classId)

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instructor/page.tsx:mount',message:'data structure check',data:{count:allStudentsProgress?.length,firstItem:allStudentsProgress?.[0]?JSON.stringify(allStudentsProgress[0]).slice(0,400):null,keys:allStudentsProgress?.[0]?Object.keys(allStudentsProgress[0]):null,hasStudentProp:allStudentsProgress?.[0]?.hasOwnProperty('student'),hasUserName:allStudentsProgress?.[0]?.hasOwnProperty('user_name')},timestamp:Date.now(),sessionId:'debug-session',runId:'instructor-v1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  const isLoading = progressLoading || assignmentsLoading || logsLoading

  // Gate for non-instructors: Show "Become an Instructor" enrollment screen
  if (currentRole !== 'instructor') {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <GlassCard className="p-8 text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--theme-primary))]/20 flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="w-8 h-8 text-[hsl(var(--theme-primary))]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Become an Instructor</h3>
            <p className="text-[var(--text-muted)] mb-6">
              Enter your instructor access code to create and manage courses.
            </p>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter access code"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
              />
              <Button variant="glass-theme" className="w-full">
                Verify Code
              </Button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-6">
              Don&apos;t have a code? <a href="#" className="text-[hsl(var(--theme-primary))] hover:underline">Learn about instructor accounts</a>
            </p>
          </GlassCard>
        </div>
      </PageContainer>
    )
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
        </div>
      </PageContainer>
    )
  }

  // Compute stats
  const totalStudents = allStudentsProgress.length
  const pendingSubmissions = submissions.filter(s => s.status === 'submitted').length
  const pendingTradeLogs = tradeLogs.filter(l => !l.feedback).length

  const avgProgress = totalStudents > 0
    ? Math.round(
        allStudentsProgress.reduce((sum, sp) => {
          const p = sp.progress
          if (!p) return sum
          const lessonPct = p.total_lessons > 0 ? (p.lessons_completed / p.total_lessons) * 100 : 0
          const assignPct = p.total_assignments > 0 ? (p.assignments_submitted / p.total_assignments) * 100 : 0
          return sum + (lessonPct + assignPct) / 2
        }, 0) / totalStudents
      )
    : 0

  // Recent submissions to review (last 5)
  const recentPendingSubmissions = submissions
    .filter(s => s.status === 'submitted')
    .slice(0, 5)

  // Recent trade logs to review (last 5)
  const recentPendingLogs = tradeLogs
    .filter(l => !l.feedback)
    .slice(0, 5)

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Instructor Dashboard</h1>
          <p className="text-[var(--text-muted)]">
            Monitor student progress and review submissions
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStudents}</p>
                <p className="text-sm text-[var(--text-muted)]">Students</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingSubmissions}</p>
                <p className="text-sm text-[var(--text-muted)]">Pending Reviews</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <LineChart className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingTradeLogs}</p>
                <p className="text-sm text-[var(--text-muted)]">Trade Logs to Review</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--theme-primary))]/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[hsl(var(--theme-primary))]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{avgProgress}%</p>
                <p className="text-sm text-[var(--text-muted)]">Avg Progress</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Submissions */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Pending Submissions</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push(`/university/${classId}/reviews`)}
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {recentPendingSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)]">No pending submissions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPendingSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {submission.student_name || 'Student'}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {submission.assignment_title || 'Assignment'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <Clock className="w-3 h-3" />
                      {new Date(submission.submitted_at || '').toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Pending Trade Logs */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Trade Logs to Review</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push(`/university/${classId}/reviews`)}
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {recentPendingLogs.length === 0 ? (
              <div className="text-center py-8">
                <LineChart className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)]">No trade logs to review</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPendingLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <LineChart className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {log.student_name || 'Student'}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                          {log.reflection?.substring(0, 50)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <Clock className="w-3 h-3" />
                      {new Date(log.trade_date || '').toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Student Progress Table */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Student Progress</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/university/${classId}/students`)}
            >
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {allStudentsProgress.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-[var(--text-muted)]">No students enrolled yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] py-3 px-2">Student</th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] py-3 px-2">Lessons</th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] py-3 px-2">Assignments</th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] py-3 px-2">Trade Logs</th>
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] py-3 px-2">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {allStudentsProgress.slice(0, 5).map((sp) => {
                    // sp is a flat StudentProgress object (user_id, user_name, lessons_completed, etc.)
                    const lessonPct = sp.total_lessons > 0 
                      ? Math.round((sp.lessons_completed / sp.total_lessons) * 100) 
                      : 0
                    const assignPct = sp.total_assignments > 0 
                      ? Math.round((sp.assignments_completed / sp.total_assignments) * 100) 
                      : 0
                    const overallPct = Math.round((lessonPct + assignPct) / 2)

                    return (
                      <tr key={sp.user_id} className="border-b border-white/5">
                        <td className="py-3 px-2">
                          <p className="text-sm font-medium text-white">
                            {sp.user_name || 'Student'}
                          </p>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-[var(--text-muted)]">
                            {sp.lessons_completed || 0}/{sp.total_lessons || 0}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-[var(--text-muted)]">
                            {sp.assignments_completed || 0}/{sp.total_assignments || 0}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-[var(--text-muted)]">
                            {sp.trade_logs_submitted || 0}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 rounded-full bg-white/10 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-[hsl(var(--theme-primary))] to-[hsl(var(--theme-primary-light))]"
                                style={{ width: `${overallPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-[var(--text-muted)]">{overallPct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </PageContainer>
  )
}
