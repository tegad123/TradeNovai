"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  Plus,
  Clock,
  Target,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Users,
  BarChart3,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { GlassCard } from '@/components/glass/GlassCard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUniversity } from '@/lib/contexts/UniversityContext'
import { useUniversityQuizzes } from '@/lib/hooks/useUniversityQuizzes'
import { QuizCreator } from '@/components/university/quiz'
import { getStudentQuizAttempts } from '@/lib/supabase/universityUtils'
import type { Quiz, QuizAttempt } from '@/lib/types/quiz'

interface PageProps {
  params: { classId: string }
}

export default function QuizzesPage({ params }: PageProps) {
  const { classId } = params
  const router = useRouter()
  const { currentRole, currentUser } = useUniversity()
  
  const {
    quizzes,
    loading,
    error,
    deleteExistingQuiz,
    publishQuiz,
    refresh
  } = useUniversityQuizzes({ courseId: classId, role: currentRole })
  
  const [showCreator, setShowCreator] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [studentAttempts, setStudentAttempts] = useState<Record<string, QuizAttempt[]>>({})
  const [loadingAttempts, setLoadingAttempts] = useState<Record<string, boolean>>({})

  const isInstructor = currentRole === 'instructor'

  // Load student attempts for each quiz
  const loadStudentAttempts = async (quizId: string) => {
    if (!currentUser?.id || studentAttempts[quizId]) return
    
    setLoadingAttempts(prev => ({ ...prev, [quizId]: true }))
    try {
      const attempts = await getStudentQuizAttempts(quizId, currentUser.id)
      setStudentAttempts(prev => ({ ...prev, [quizId]: attempts }))
    } catch (err) {
      console.error('Error loading attempts:', err)
    } finally {
      setLoadingAttempts(prev => ({ ...prev, [quizId]: false }))
    }
  }

  const handleQuizClick = async (quiz: Quiz) => {
    if (isInstructor) {
      // Navigate to quiz detail/management page
      router.push(`/university/${classId}/quizzes/${quiz.id}`)
    } else {
      // Student: load attempts first
      await loadStudentAttempts(quiz.id)
      router.push(`/university/${classId}/quizzes/${quiz.id}`)
    }
  }

  const handleCreateQuiz = () => {
    setEditingQuiz(null)
    setShowCreator(true)
  }

  const handleEditQuiz = (quiz: Quiz, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingQuiz(quiz)
    setShowCreator(true)
  }

  const handleDeleteClick = (quiz: Quiz, e: React.MouseEvent) => {
    e.stopPropagation()
    setQuizToDelete(quiz)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!quizToDelete) return
    
    setDeleting(true)
    const success = await deleteExistingQuiz(quizToDelete.id)
    setDeleting(false)
    
    if (success) {
      setDeleteDialogOpen(false)
      setQuizToDelete(null)
    }
  }

  const handleTogglePublish = async (quiz: Quiz, e: React.MouseEvent) => {
    e.stopPropagation()
    await publishQuiz(quiz.id, !quiz.is_published)
  }

  const handleQuizSaved = () => {
    setShowCreator(false)
    setEditingQuiz(null)
    refresh()
  }

  const getQuizStatusBadge = (quiz: Quiz, attempts: QuizAttempt[] | undefined) => {
    if (isInstructor) {
      return quiz.is_published ? (
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
    }

    // Student view
    if (!attempts || attempts.length === 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] bg-white/5 px-2 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          Not Started
        </span>
      )
    }

    const latestAttempt = attempts[0]
    if (latestAttempt.status === 'graded') {
      const passed = (latestAttempt.score_percentage || 0) >= (quiz.passing_score || 70)
      return (
        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
          passed ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
        }`}>
          <CheckCircle2 className="w-3 h-3" />
          {latestAttempt.score_percentage}%
        </span>
      )
    }

    if (latestAttempt.status === 'submitted') {
      return (
        <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
          <AlertCircle className="w-3 h-3" />
          Pending Review
        </span>
      )
    }

    if (latestAttempt.status === 'in_progress') {
      return (
        <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          In Progress
        </span>
      )
    }

    return null
  }

  if (showCreator) {
    return (
      <PageContainer>
        <QuizCreator
          courseId={classId}
          existingQuiz={editingQuiz ? { ...editingQuiz, questions: [] } : null}
          onSave={handleQuizSaved}
          onCancel={() => {
            setShowCreator(false)
            setEditingQuiz(null)
          }}
        />
      </PageContainer>
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

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Quizzes</h1>
            <p className="text-[var(--text-muted)]">
              {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} in this course
            </p>
          </div>
          {isInstructor && (
            <Button variant="glass-theme" size="sm" onClick={handleCreateQuiz}>
              <Plus className="w-4 h-4 mr-2" />
              Create Quiz
            </Button>
          )}
        </div>

        {/* Quizzes List */}
        {quizzes.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <ClipboardList className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Quizzes Yet</h3>
            <p className="text-[var(--text-muted)]">
              {isInstructor
                ? 'Create your first quiz to test student knowledge'
                : 'Your instructor hasn\'t posted any quizzes yet'}
            </p>
            {isInstructor && (
              <Button variant="glass-theme" className="mt-4" onClick={handleCreateQuiz}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Quiz
              </Button>
            )}
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => {
              const attempts = studentAttempts[quiz.id]
              
              return (
                <GlassCard
                  key={quiz.id}
                  className="p-4 hover:bg-white/[0.08] cursor-pointer transition-all"
                  onClick={() => handleQuizClick(quiz)}
                  onMouseEnter={() => !isInstructor && loadStudentAttempts(quiz.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-theme-gradient/20 flex items-center justify-center shrink-0">
                        <ClipboardList className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
                      </div>
                      
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-white">{quiz.title}</h3>
                          {getQuizStatusBadge(quiz, attempts)}
                        </div>
                        
                        {quiz.description && (
                          <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                            {quiz.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {quiz.points_possible} points
                          </span>
                          {quiz.time_limit_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {quiz.time_limit_minutes} min
                            </span>
                          )}
                          {quiz.max_attempts && (
                            <span>{quiz.max_attempts} attempt{quiz.max_attempts !== 1 ? 's' : ''}</span>
                          )}
                          {quiz.module_title && (
                            <span>Module: {quiz.module_title}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isInstructor && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg hover:bg-white/10"
                            onClick={(e) => handleTogglePublish(quiz, e)}
                            title={quiz.is_published ? 'Unpublish' : 'Publish'}
                          >
                            {quiz.is_published ? (
                              <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />
                            ) : (
                              <Eye className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg hover:bg-white/10"
                            onClick={(e) => handleEditQuiz(quiz, e)}
                          >
                            <Edit className="w-4 h-4 text-[var(--text-muted)]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg hover:bg-red-500/20"
                            onClick={(e) => handleDeleteClick(quiz, e)}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </>
                      )}
                      <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Delete Quiz
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{quizToDelete?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300">
              This will permanently delete:
            </p>
            <ul className="mt-2 text-sm text-[var(--text-muted)] list-disc list-inside space-y-1">
              <li>The quiz and all questions</li>
              <li>All student attempts and responses</li>
              <li>All grades and scores</li>
            </ul>
          </div>

          <DialogFooter className="mt-6">
            <Button 
              variant="glass" 
              onClick={() => {
                setDeleteDialogOpen(false)
                setQuizToDelete(null)
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
