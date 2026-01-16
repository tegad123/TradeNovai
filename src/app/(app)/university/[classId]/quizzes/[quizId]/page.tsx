"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Clock,
  Target,
  Users,
  Play,
  BarChart3,
  Edit,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { GlassCard } from '@/components/glass/GlassCard'
import { Button } from '@/components/ui/button'
import { useUniversity } from '@/lib/contexts/UniversityContext'
import { 
  getQuizWithQuestions, 
  getStudentQuizAttempts,
  getQuizAttempts,
  getQuizStats,
  updateQuiz
} from '@/lib/supabase/universityUtils'
import { QuizCreator, QuizTaker, QuizResults, QuizResultsTable, StudentAttemptDetail } from '@/components/university/quiz'
import type { QuizWithQuestions, QuizAttempt, QuizStats } from '@/lib/types/quiz'

interface PageProps {
  params: { classId: string; quizId: string }
}

type ViewMode = 'detail' | 'edit' | 'take' | 'results' | 'all-results' | 'attempt-detail'

export default function QuizDetailPage({ params }: PageProps) {
  const { classId, quizId } = params
  const router = useRouter()
  const { currentRole, currentUser } = useUniversity()
  
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null)
  const [studentAttempts, setStudentAttempts] = useState<QuizAttempt[]>([])
  const [allAttempts, setAllAttempts] = useState<QuizAttempt[]>([])
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('detail')
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null)
  const [publishing, setPublishing] = useState(false)

  const isInstructor = currentRole === 'instructor'

  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true)
        const quizData = await getQuizWithQuestions(quizId)
        setQuiz(quizData)

        if (quizData) {
          if (isInstructor) {
            const [attemptsData, statsData] = await Promise.all([
              getQuizAttempts(quizId),
              getQuizStats(quizId)
            ])
            setAllAttempts(attemptsData)
            setStats(statsData)
          } else if (currentUser?.id) {
            const attempts = await getStudentQuizAttempts(quizId, currentUser.id)
            setStudentAttempts(attempts)
          }
        }
      } catch (err) {
        console.error('Error loading quiz:', err)
      } finally {
        setLoading(false)
      }
    }
    loadQuiz()
  }, [quizId, isInstructor, currentUser?.id])

  const handleBack = () => {
    router.push(`/university/${classId}/quizzes`)
  }

  const handleTogglePublish = async () => {
    if (!quiz) return
    setPublishing(true)
    const success = await updateQuiz(quizId, { is_published: !quiz.is_published } as any)
    if (success) {
      setQuiz(prev => prev ? { ...prev, is_published: !prev.is_published } : null)
    }
    setPublishing(false)
  }

  const handleQuizComplete = async (score: number) => {
    // Reload attempts after completion
    if (currentUser?.id) {
      const attempts = await getStudentQuizAttempts(quizId, currentUser.id)
      setStudentAttempts(attempts)
    }
    setViewMode('results')
  }

  const handleViewAttempt = (attempt: QuizAttempt) => {
    setSelectedAttempt(attempt)
    setViewMode('attempt-detail')
  }

  const canTakeQuiz = () => {
    if (!quiz || isInstructor) return false
    
    // Check max attempts
    if (quiz.max_attempts) {
      const completedAttempts = studentAttempts.filter(
        a => a.status === 'submitted' || a.status === 'graded'
      ).length
      if (completedAttempts >= quiz.max_attempts) return false
    }
    
    // Check for in-progress attempt
    const inProgressAttempt = studentAttempts.find(a => a.status === 'in_progress')
    if (inProgressAttempt) return true // Can continue
    
    return true
  }

  const getLatestAttempt = () => {
    return studentAttempts.find(a => 
      a.status === 'submitted' || a.status === 'graded'
    )
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
        </div>
      </PageContainer>
    )
  }

  if (!quiz) {
    return (
      <PageContainer>
        <GlassCard className="p-8 text-center">
          <p className="text-[var(--text-muted)]">Quiz not found</p>
          <Button variant="glass" className="mt-4" onClick={handleBack}>
            Go Back
          </Button>
        </GlassCard>
      </PageContainer>
    )
  }

  // Edit mode (instructor)
  if (viewMode === 'edit') {
    return (
      <PageContainer>
        <QuizCreator
          courseId={classId}
          existingQuiz={quiz}
          onSave={() => {
            setViewMode('detail')
            // Reload quiz
            getQuizWithQuestions(quizId).then(setQuiz)
          }}
          onCancel={() => setViewMode('detail')}
        />
      </PageContainer>
    )
  }

  // Take quiz mode (student)
  if (viewMode === 'take') {
    return (
      <PageContainer>
        <QuizTaker
          quizId={quizId}
          studentId={currentUser?.id || ''}
          onComplete={handleQuizComplete}
          onExit={() => setViewMode('detail')}
        />
      </PageContainer>
    )
  }

  // View results mode (student)
  if (viewMode === 'results' && studentAttempts.length > 0) {
    const latestAttempt = getLatestAttempt()
    if (latestAttempt) {
      return (
        <PageContainer>
          <QuizResults
            attemptId={latestAttempt.id}
            onBack={() => setViewMode('detail')}
            onRetake={canTakeQuiz() ? () => setViewMode('take') : undefined}
          />
        </PageContainer>
      )
    }
  }

  // All results mode (instructor)
  if (viewMode === 'all-results') {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setViewMode('detail')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h2 className="text-xl font-bold text-white">All Results: {quiz.title}</h2>
          </div>
          
          <QuizResultsTable
            quizId={quizId}
            passingScore={quiz.passing_score}
            onViewAttempt={handleViewAttempt}
          />
        </div>
      </PageContainer>
    )
  }

  // Attempt detail mode (instructor)
  if (viewMode === 'attempt-detail' && selectedAttempt) {
    return (
      <PageContainer>
        <StudentAttemptDetail
          attemptId={selectedAttempt.id}
          instructorId={currentUser?.id || ''}
          onBack={() => setViewMode('all-results')}
        />
      </PageContainer>
    )
  }

  // Default: detail view
  const latestAttempt = getLatestAttempt()
  const inProgressAttempt = studentAttempts.find(a => a.status === 'in_progress')

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {isInstructor && (
              <>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleTogglePublish}
                  disabled={publishing}
                >
                  {publishing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : quiz.is_published ? (
                    <EyeOff className="w-4 h-4 mr-2" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  {quiz.is_published ? 'Unpublish' : 'Publish'}
                </Button>
                <Button variant="glass" size="sm" onClick={() => setViewMode('edit')}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Quiz Info */}
        <GlassCard className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-theme-gradient/20 flex items-center justify-center shrink-0">
              <Target className="w-8 h-8 text-[hsl(var(--theme-primary))]" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
                {isInstructor && (
                  quiz.is_published ? (
                    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                      <Eye className="w-3 h-3" />
                      Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
                      <EyeOff className="w-3 h-3" />
                      Draft
                    </span>
                  )
                )}
              </div>
              
              {quiz.description && (
                <p className="text-[var(--text-muted)] mb-4">{quiz.description}</p>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                    <Target className="w-4 h-4" />
                    Points
                  </div>
                  <p className="text-lg font-bold text-white">{quiz.points_possible}</p>
                </div>
                
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                    <Clock className="w-4 h-4" />
                    Time Limit
                  </div>
                  <p className="text-lg font-bold text-white">
                    {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'Unlimited'}
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                    <RefreshCw className="w-4 h-4" />
                    Attempts
                  </div>
                  <p className="text-lg font-bold text-white">
                    {quiz.max_attempts ? quiz.max_attempts : 'Unlimited'}
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Passing
                  </div>
                  <p className="text-lg font-bold text-white">{quiz.passing_score}%</p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Instructor: Stats & View Results */}
        {isInstructor && (
          <>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                    <Users className="w-4 h-4" />
                    Total Attempts
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.total_attempts}</p>
                </GlassCard>
                
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                    <BarChart3 className="w-4 h-4" />
                    Average Score
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.average_score}%</p>
                </GlassCard>
                
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Pass Rate
                  </div>
                  <p className="text-2xl font-bold text-green-400">{stats.pass_rate}%</p>
                </GlassCard>
                
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
                    <Clock className="w-4 h-4" />
                    Avg Time
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {Math.floor((stats.average_time_seconds || 0) / 60)}m
                  </p>
                </GlassCard>
              </div>
            )}
            
            <Button variant="glass-theme" onClick={() => setViewMode('all-results')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              View All Results ({allAttempts.length} attempts)
            </Button>
          </>
        )}

        {/* Student: Take Quiz / View Results */}
        {!isInstructor && (
          <div className="space-y-4">
            {/* Previous attempts */}
            {studentAttempts.length > 0 && (
              <GlassCard className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Your Attempts</h3>
                <div className="space-y-2">
                  {studentAttempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[var(--text-muted)]">
                          Attempt #{attempt.attempt_number}
                        </span>
                        {attempt.status === 'graded' && (
                          <span className={`font-semibold ${
                            (attempt.score_percentage || 0) >= quiz.passing_score
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                            {attempt.score_percentage}%
                          </span>
                        )}
                        {attempt.status === 'submitted' && (
                          <span className="text-blue-400 text-sm">Pending Review</span>
                        )}
                        {attempt.status === 'in_progress' && (
                          <span className="text-yellow-400 text-sm">In Progress</span>
                        )}
                      </div>
                      
                      {attempt.status === 'in_progress' ? (
                        <Button size="sm" onClick={() => setViewMode('take')}>
                          Continue
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAttempt(attempt)
                            setViewMode('results')
                          }}
                        >
                          View Results
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Start/Retake button */}
            {canTakeQuiz() && !inProgressAttempt && (
              <Button size="lg" className="w-full" onClick={() => setViewMode('take')}>
                <Play className="w-5 h-5 mr-2" />
                {studentAttempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
              </Button>
            )}
            
            {!canTakeQuiz() && !inProgressAttempt && (
              <GlassCard className="p-4 text-center">
                <AlertCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)]">
                  You have used all available attempts for this quiz.
                </p>
              </GlassCard>
            )}
          </div>
        )}

        {/* Questions preview (instructor only) */}
        {isInstructor && quiz.questions.length > 0 && (
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Questions ({quiz.questions.length})
            </h3>
            <div className="space-y-3">
              {quiz.questions.map((q, idx) => (
                <div key={q.id} className="p-3 rounded-lg bg-white/5">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-[var(--text-muted)] w-6">
                      {idx + 1}.
                    </span>
                    <div className="flex-1">
                      <p className="text-white">{q.question_text}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                        <span className="capitalize">{q.question_type.replace('_', ' ')}</span>
                        <span>{q.points} pts</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </PageContainer>
  )
}
