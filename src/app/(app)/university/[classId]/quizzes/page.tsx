"use client"

import { useState, useEffect } from 'react'
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
  AlertCircle,
  Settings2,
  Lock
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
import { Switch } from '@/components/ui/switch'
import { useUniversity } from '@/lib/contexts/UniversityContext'
import { useUniversityQuizzes } from '@/lib/hooks/useUniversityQuizzes'
import { useUniversityModules } from '@/lib/hooks/useUniversityModules'
import { useUniversityAssignments } from '@/lib/hooks/useUniversityAssignments'
import { QuizCreator } from '@/components/university/quiz'
import { 
  getStudentQuizAttempts,
  getCourseStudents,
  getQuizTargets,
  assignQuizToStudent,
  unassignQuizFromStudent,
  updateQuiz,
  getQuizModulePrerequisites,
  setQuizModulePrerequisites,
  getQuizAssignmentPrerequisites,
  setQuizAssignmentPrerequisites,
  type UserProfile
} from '@/lib/supabase/universityUtils'
import type { Quiz, QuizAttempt } from '@/lib/types/quiz'

interface PageProps {
  params: { classId: string }
}

export default function QuizzesPage({ params }: PageProps) {
  const { classId } = params
  const router = useRouter()
  const { currentRole, currentUser, currentCourse } = useUniversity()
  
  const {
    quizzes,
    quizLockStatus,
    loading,
    error,
    deleteExistingQuiz,
    publishQuiz,
    refresh
  } = useUniversityQuizzes({ courseId: classId, role: currentRole, studentId: currentUser?.id })
  
  const [showCreator, setShowCreator] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [studentAttempts, setStudentAttempts] = useState<Record<string, QuizAttempt[]>>({})
  const [loadingAttempts, setLoadingAttempts] = useState<Record<string, boolean>>({})
  
  // Manage access state
  const [manageAccessOpen, setManageAccessOpen] = useState(false)
  const [accessQuizId, setAccessQuizId] = useState<string | null>(null)
  const [courseStudents, setCourseStudents] = useState<UserProfile[]>([])
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([])
  const [updatingAccess, setUpdatingAccess] = useState(false)
  
  // Prerequisites state
  const [selectedModulePrereqs, setSelectedModulePrereqs] = useState<string[]>([])
  const [selectedAssignmentPrereqs, setSelectedAssignmentPrereqs] = useState<string[]>([])
  const [savingPrerequisites, setSavingPrerequisites] = useState(false)
  
  // Get modules and assignments for prerequisite selection
  const { modules } = useUniversityModules(currentCourse?.id || null)
  const { assignments } = useUniversityAssignments(classId, currentRole)

  const isInstructor = currentRole === 'instructor'
  
  // Load course students for targeting
  useEffect(() => {
    async function loadStudents() {
      if (!classId || !isInstructor) return
      const students = await getCourseStudents(classId)
      setCourseStudents(students)
    }
    loadStudents()
  }, [classId, isInstructor])
  
  // Load quiz targets and prerequisites when manage access opens
  useEffect(() => {
    async function loadQuizAccess() {
      if (!accessQuizId || !manageAccessOpen) return
      
      // Load targets
      const targets = await getQuizTargets(accessQuizId)
      setAssignedStudentIds(targets)
      
      // Load prerequisites
      const modulePrereqs = await getQuizModulePrerequisites(accessQuizId)
      setSelectedModulePrereqs(modulePrereqs)
      
      const assignmentPrereqs = await getQuizAssignmentPrerequisites(accessQuizId)
      setSelectedAssignmentPrereqs(assignmentPrereqs)
    }
    loadQuizAccess()
  }, [accessQuizId, manageAccessOpen])

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
  
  const handleManageAccess = (quiz: Quiz, e: React.MouseEvent) => {
    e.stopPropagation()
    setAccessQuizId(quiz.id)
    setManageAccessOpen(true)
  }
  
  const handleToggleRestricted = async (restricted: boolean) => {
    if (!accessQuizId) return
    setUpdatingAccess(true)
    await updateQuiz(accessQuizId, { is_restricted: restricted } as any)
    refresh()
    setUpdatingAccess(false)
  }
  
  const handleToggleQuizPublished = async (published: boolean) => {
    if (!accessQuizId) return
    setUpdatingAccess(true)
    await updateQuiz(accessQuizId, { is_published: published } as any)
    refresh()
    setUpdatingAccess(false)
  }
  
  const handleToggleStudentAssignment = async (studentId: string) => {
    if (!accessQuizId) return
    setUpdatingAccess(true)
    
    if (assignedStudentIds.includes(studentId)) {
      await unassignQuizFromStudent(accessQuizId, studentId)
      setAssignedStudentIds(prev => prev.filter(id => id !== studentId))
    } else {
      await assignQuizToStudent(accessQuizId, studentId)
      setAssignedStudentIds(prev => [...prev, studentId])
    }
    
    setUpdatingAccess(false)
  }
  
  const handleToggleModulePrereq = (moduleId: string) => {
    setSelectedModulePrereqs(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }
  
  const handleToggleAssignmentPrereq = (assignmentId: string) => {
    setSelectedAssignmentPrereqs(prev => 
      prev.includes(assignmentId) 
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    )
  }
  
  const handleSavePrerequisites = async () => {
    if (!accessQuizId) return
    setSavingPrerequisites(true)
    
    await setQuizModulePrerequisites(accessQuizId, selectedModulePrereqs)
    await setQuizAssignmentPrerequisites(accessQuizId, selectedAssignmentPrereqs)
    
    setSavingPrerequisites(false)
  }
  
  const getAccessQuiz = () => quizzes.find(q => q.id === accessQuizId)

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
              const lockStatus = quizLockStatus.get(quiz.id)
              const isLocked = !isInstructor && lockStatus?.isLocked
              
              return (
                <GlassCard
                  key={quiz.id}
                  className={`p-4 transition-all ${
                    isLocked 
                      ? 'opacity-60 cursor-not-allowed' 
                      : 'hover:bg-white/[0.08] cursor-pointer'
                  }`}
                  onClick={() => !isLocked && handleQuizClick(quiz)}
                  onMouseEnter={() => !isInstructor && !isLocked && loadStudentAttempts(quiz.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isLocked ? 'bg-white/10' : 'bg-theme-gradient/20'
                      }`}>
                        {isLocked ? (
                          <Lock className="w-5 h-5 text-[var(--text-muted)]" />
                        ) : (
                          <ClipboardList className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
                        )}
                      </div>
                      
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-white">{quiz.title}</h3>
                          {isLocked ? (
                            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] bg-white/5 px-2 py-1 rounded-full">
                              <Lock className="w-3 h-3" />
                              Locked
                            </span>
                          ) : (
                            getQuizStatusBadge(quiz, attempts)
                          )}
                          {isInstructor && quiz.is_restricted && (
                            <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full">
                              <Users className="w-3 h-3" />
                              Restricted
                            </span>
                          )}
                        </div>
                        
                        {isLocked && lockStatus ? (
                          <p className="text-sm text-[var(--text-muted)]">
                            Complete prerequisites to unlock this quiz
                            {lockStatus.incompleteModuleIds.length > 0 && (
                              <span className="block text-xs mt-1">
                                {lockStatus.incompleteModuleIds.length} module{lockStatus.incompleteModuleIds.length !== 1 ? 's' : ''} remaining
                              </span>
                            )}
                            {lockStatus.incompleteAssignmentIds.length > 0 && (
                              <span className="block text-xs">
                                {lockStatus.incompleteAssignmentIds.length} assignment{lockStatus.incompleteAssignmentIds.length !== 1 ? 's' : ''} remaining
                              </span>
                            )}
                          </p>
                        ) : quiz.description ? (
                          <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                            {quiz.description}
                          </p>
                        ) : null}
                        
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
                            onClick={(e) => handleManageAccess(quiz, e)}
                            title="Manage Access"
                          >
                            <Settings2 className="w-4 h-4 text-[var(--text-muted)]" />
                          </Button>
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
      
      {/* Manage Access Dialog */}
      <Dialog open={manageAccessOpen} onOpenChange={setManageAccessOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Quiz Access</DialogTitle>
            <DialogDescription>
              Control visibility, targeting, and prerequisites for this quiz.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            {/* Published Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white">Published</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Students only see published quizzes.
                </div>
              </div>
              <Switch
                checked={getAccessQuiz()?.is_published || false}
                onCheckedChange={handleToggleQuizPublished}
                disabled={updatingAccess}
              />
            </div>

            {/* Restrict Access Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white">Restrict Access</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Only assigned students will see this quiz.
                </div>
              </div>
              <Switch
                checked={getAccessQuiz()?.is_restricted || false}
                onCheckedChange={handleToggleRestricted}
                disabled={updatingAccess}
              />
            </div>

            {/* Module Prerequisites */}
            <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white">Module Prerequisites</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Students must complete these modules first
                </div>
              </div>
              <div className="max-h-[120px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {modules.length > 0 ? (
                  modules.map(mod => (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10"
                    >
                      <span className="text-sm text-white">{mod.title}</span>
                      <Switch
                        checked={selectedModulePrereqs.includes(mod.id)}
                        onCheckedChange={() => handleToggleModulePrereq(mod.id)}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-2">
                    No modules created yet.
                  </p>
                )}
              </div>
            </div>

            {/* Assignment Prerequisites */}
            <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white">Assignment Prerequisites</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Students must complete these assignments first
                </div>
              </div>
              <div className="max-h-[120px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {assignments.length > 0 ? (
                  assignments.map(assignment => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10"
                    >
                      <span className="text-sm text-white">{assignment.title}</span>
                      <Switch
                        checked={selectedAssignmentPrereqs.includes(assignment.id)}
                        onCheckedChange={() => handleToggleAssignmentPrereq(assignment.id)}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-2">
                    No assignments created yet.
                  </p>
                )}
              </div>
            </div>

            {/* Save Prerequisites Button */}
            {(modules.length > 0 || assignments.length > 0) && (
              <Button
                variant="glass-theme"
                size="sm"
                onClick={handleSavePrerequisites}
                disabled={savingPrerequisites}
                className="w-full"
              >
                {savingPrerequisites ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Prerequisites
              </Button>
            )}

            {/* Assign Students (only shown when restricted) */}
            {getAccessQuiz()?.is_restricted && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white px-1">Assign Students</h4>
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {courseStudents.length > 0 ? (
                    courseStudents.map(student => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-theme-gradient flex items-center justify-center text-xs font-bold text-white uppercase">
                            {student.full_name?.charAt(0) || 'S'}
                          </div>
                          <span className="text-sm text-white font-medium">
                            {student.full_name || 'Student'}
                          </span>
                        </div>
                        <Switch
                          disabled={updatingAccess}
                          checked={assignedStudentIds.includes(student.id)}
                          onCheckedChange={() => handleToggleStudentAssignment(student.id)}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">
                      No students enrolled yet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="glass-theme" className="w-full" onClick={() => setManageAccessOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
