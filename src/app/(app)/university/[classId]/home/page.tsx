"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import {
  BookOpen,
  ClipboardList,
  MessageSquare,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react"
import { useUniversity } from "@/lib/contexts/UniversityContext"
import { useUniversityModules } from "@/lib/hooks/useUniversityModules"
import { useUniversityAssignments } from "@/lib/hooks/useUniversityAssignments"
import { useUniversityMessages } from "@/lib/hooks/useUniversityMessages"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"

export default function CourseHomePage() {
  const params = useParams()
  const classId = params.classId as string
  const { currentCourse, currentRole } = useUniversity()

  // Load real data from Supabase
  const { modules, progressPercent, loading: modulesLoading } = useUniversityModules(currentCourse?.id || null)
  const { assignments, loading: assignmentsLoading } = useUniversityAssignments(currentCourse?.id || null, currentRole)
  const { totalUnread } = useUniversityMessages(currentCourse?.id || null)

  // Get upcoming assignments
  const upcomingAssignments = assignments
    .filter(a => a.due_date && new Date(a.due_date) > new Date())
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 3)

  if (!currentCourse) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-[var(--text-muted)]">Loading course...</div>
        </div>
      </PageContainer>
    )
  }

  const isLoading = modulesLoading || assignmentsLoading

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Course Header */}
        <div className="space-y-2">
          <p className="text-sm text-[var(--text-muted)]">{currentCourse.code}</p>
          <h1 className="text-2xl font-bold text-white">{currentCourse.name}</h1>
          <p className="text-[var(--text-muted)] max-w-2xl">{currentCourse.description}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {isLoading ? "..." : modules.length}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Modules</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {isLoading ? "..." : assignments.length}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Assignments</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {isLoading ? "..." : `${progressPercent}%`}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Complete</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalUnread}</p>
                <p className="text-xs text-[var(--text-muted)]">Unread</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Continue Learning */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Continue Learning</h2>
              <Link 
                href={`/university/${classId}/modules`}
                className="text-sm text-[hsl(var(--theme-primary))] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : modules.length > 0 ? (
              <div className="space-y-3">
                {modules.slice(0, 3).map((module) => {
                  const completedCount = module.lessons?.filter(l => l.is_completed).length || 0
                  const totalCount = module.lessons?.length || 0
                  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

                  return (
                    <Link 
                      key={module.id}
                      href={`/university/${classId}/modules`}
                      className="block p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">{module.title}</h3>
                        <span className="text-xs text-[var(--text-muted)]">
                          {completedCount}/{totalCount} lessons
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10">
                        <div 
                          className="h-full rounded-full bg-theme-gradient transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No modules yet</p>
              </div>
            )}
          </GlassCard>

          {/* Upcoming Assignments */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Upcoming Assignments</h2>
              <Link 
                href={`/university/${classId}/assignments`}
                className="text-sm text-[hsl(var(--theme-primary))] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : upcomingAssignments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAssignments.map((assignment) => {
                  const dueDate = new Date(assignment.due_date!)
                  const isUrgent = dueDate.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 // 3 days

                  return (
                    <Link 
                      key={assignment.id}
                      href={`/university/${classId}/assignments`}
                      className="block p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isUrgent ? 'bg-red-500/20' : 'bg-white/10'
                        }`}>
                          {isUrgent ? (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{assignment.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                            <span>Due {dueDate.toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{assignment.points} pts</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No upcoming assignments</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Instructor Info */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Instructor</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-theme-gradient flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {(currentCourse.instructor_name || 'I').charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-medium text-white">{currentCourse.instructor_name || 'Instructor'}</p>
              <p className="text-sm text-[var(--text-muted)]">Course Instructor</p>
            </div>
            <Link 
              href={`/university/${classId}/messages`}
              className="ml-auto"
            >
              <button className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-white transition-colors">
                Send Message
              </button>
            </Link>
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  )
}
