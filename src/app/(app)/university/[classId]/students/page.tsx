"use client"
import {
  Users,
  Search,
  Mail,
  BookOpen,
  FileText,
  LineChart,
  TrendingUp,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"
import { useUniversity } from "@/lib/contexts/UniversityContext"
import { useUniversityProgress } from "@/lib/hooks/useUniversityProgress"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface PageProps {
  params: { classId: string }
}

export default function StudentsPage({ params }: PageProps) {
  const { classId } = params
  const router = useRouter()
  const { currentRole } = useUniversity()
  const { allStudentsProgress, loading: isLoading } = useUniversityProgress(classId, currentRole)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  // Redirect if not instructor
  if (currentRole !== 'instructor') {
    return (
      <PageContainer>
        <GlassCard className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Access Denied</h3>
          <p className="text-[var(--text-muted)]">
            This page is only accessible to instructors
          </p>
        </GlassCard>
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

  const filteredStudents = allStudentsProgress.filter(sp => {
    // sp is a flat StudentProgress object (user_id, user_name, etc.)
    const name = sp.user_name || ''
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Students</h1>
            <p className="text-[var(--text-muted)]">
              {allStudentsProgress.length} student{allStudentsProgress.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
          
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
            />
          </div>
        </div>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {searchQuery ? 'No Students Found' : 'No Students Yet'}
            </h3>
            <p className="text-[var(--text-muted)]">
              {searchQuery 
                ? 'Try a different search term'
                : 'Share your course access code to get students enrolled'}
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {filteredStudents.map((sp) => {
              // sp is a flat StudentProgress object (user_id, user_name, lessons_completed, etc.)
              const lessonPct = sp.total_lessons > 0 
                ? Math.round((sp.lessons_completed / sp.total_lessons) * 100) 
                : 0
              const assignPct = sp.total_assignments > 0 
                ? Math.round((sp.assignments_completed / sp.total_assignments) * 100) 
                : 0
              const overallPct = Math.round((lessonPct + assignPct) / 2)
              const isExpanded = expandedStudent === sp.user_id

              return (
                <GlassCard key={sp.user_id} className="overflow-hidden">
                  {/* Clickable Header */}
                  <button
                    onClick={() => setExpandedStudent(isExpanded ? null : sp.user_id)}
                    className="w-full p-4 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Student Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-theme-gradient flex items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-white">
                            {(sp.user_name || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-white truncate">
                            {sp.user_name || 'Student'}
                          </h3>
                          <p className="text-sm text-[var(--text-muted)] truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 shrink-0" />
                            {sp.user_name}
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-wrap items-center gap-4 md:gap-6">
                        {/* Lessons */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {sp.lessons_completed || 0}/{sp.total_lessons || 0}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">Lessons</p>
                          </div>
                        </div>

                        {/* Assignments */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {sp.assignments_completed || 0}/{sp.total_assignments || 0}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">Assignments</p>
                          </div>
                        </div>

                        {/* Trade Logs */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <LineChart className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {sp.trade_logs_submitted || 0}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">Trade Logs</p>
                          </div>
                        </div>

                        {/* Overall Progress */}
                        <div className="flex items-center gap-3 ml-auto">
                          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--theme-primary))]/20 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-[hsl(var(--theme-primary))]" />
                          </div>
                          <div className="w-20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-white">{overallPct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-[hsl(var(--theme-primary))] to-[hsl(var(--theme-primary-light))]"
                                style={{ width: `${overallPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Expand Icon */}
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
                      {/* Progress Bars */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-3 rounded-xl bg-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[var(--text-muted)]">Lesson Progress</span>
                            <span className="text-sm font-medium text-white">{lessonPct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div 
                              className="h-full bg-blue-400"
                              style={{ width: `${lessonPct}%` }}
                            />
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {sp.lessons_completed || 0} of {sp.total_lessons || 0} completed
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[var(--text-muted)]">Assignment Progress</span>
                            <span className="text-sm font-medium text-white">{assignPct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div 
                              className="h-full bg-purple-400"
                              style={{ width: `${assignPct}%` }}
                            />
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {sp.assignments_completed || 0} of {sp.total_assignments || 0} submitted
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[var(--text-muted)]">Average Grade</span>
                            <span className="text-sm font-medium text-white">
                              {sp.average_grade || 0}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div 
                              className="h-full bg-green-400"
                              style={{ width: `${sp.average_grade || 0}%` }}
                            />
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {sp.trade_logs_submitted || 0} trade logs submitted
                          </p>
                        </div>
                      </div>

                      {/* Activity Summary */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {sp.last_active && (
                          <div className="flex items-center gap-2 text-[var(--text-muted)]">
                            <Clock className="w-4 h-4" />
                            Last active: {' '}
                            <span className="text-white">
                              {new Date(sp.last_active).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/university/${classId}/messages`)
                          }}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Send Message
                        </Button>
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/university/${classId}/reviews`)
                          }}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Submissions
                        </Button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
