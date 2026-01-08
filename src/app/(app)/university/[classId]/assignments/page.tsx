"use client"
import { useState, useRef, useEffect } from "react"
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  ChevronRight,
  Loader2,
  X,
  FileUp,
  Download,
  Users,
  Settings2,
  AlertTriangle,
  File,
  Image as ImageIcon,
  Lock,
  Trash2,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useUniversityAssignments } from "@/lib/hooks/useUniversityAssignments"
import { useUniversityModules } from "@/lib/hooks/useUniversityModules"
import { useUniversity } from "@/lib/contexts/UniversityContext"
import { uploadAttachment, uploadFile } from "@/lib/supabase/storageUtils"
import { 
  getCourseStudents, 
  getAssignmentTargets, 
  assignAssignmentToStudent, 
  unassignAssignmentFromStudent,
  updateAssignment,
  setAssignmentPrerequisites,
  getAssignmentPrerequisites,
  getAssignmentsWithLockStatus,
  deleteAssignment as deleteAssignmentUtil,
  type Assignment, 
  type Submission, 
  type UserProfile,
  type Module
} from "@/lib/supabase/universityUtils"

interface PageProps {
  params: { classId: string }
}

export default function AssignmentsPage({ params }: PageProps) {
  const { classId } = params
  const { currentRole, currentCourse, currentUser } = useUniversity()
  const {
    assignments,
    submissions,
    loading: isLoading,
    submitAssignment,
    createAssignment,
    refetch,
  } = useUniversityAssignments(classId, currentRole)
  
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissionContent, setSubmissionContent] = useState("")
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  
  // Create assignment state
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newDueDate, setNewDueDate] = useState("")
  const [newPoints, setNewPoints] = useState("100")
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  
  // Manage access state
  const [manageAccessOpen, setManageAccessOpen] = useState(false)
  const [accessAssignmentId, setAccessAssignmentId] = useState<string | null>(null)
  const [courseStudents, setCourseStudents] = useState<UserProfile[]>([])
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([])
  const [updatingAccess, setUpdatingAccess] = useState(false)
  
  // Post-create publish dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [pendingAssignmentId, setPendingAssignmentId] = useState<string | null>(null)
  const [publishStep, setPublishStep] = useState<'choose' | 'select-students'>('choose')
  const [publishingAssignment, setPublishingAssignment] = useState(false)
  
  // Assignment prerequisites state
  const [assignmentLockStatus, setAssignmentLockStatus] = useState<Record<string, { isLocked: boolean; prerequisiteModuleIds: string[] }>>({})
  const [selectedPrerequisiteModuleIds, setSelectedPrerequisiteModuleIds] = useState<string[]>([])
  const [savingPrerequisites, setSavingPrerequisites] = useState(false)
  
  // Delete assignment state
  const [deleteAssignmentOpen, setDeleteAssignmentOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null)
  const [deletingAssignment, setDeletingAssignment] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  // Get modules for prerequisite selection
  const { modules } = useUniversityModules(currentCourse?.id || null)

  const isInstructor = currentRole === 'instructor'

  // Load assignment lock status for students
  useEffect(() => {
    async function loadLockStatus() {
      if (!currentCourse?.id || !currentUser?.id || isInstructor) return
      
      const lockData = await getAssignmentsWithLockStatus(currentCourse.id, currentUser.id)
      const lockMap: Record<string, { isLocked: boolean; prerequisiteModuleIds: string[] }> = {}
      lockData.forEach(item => {
        lockMap[item.assignmentId] = {
          isLocked: item.isLocked,
          prerequisiteModuleIds: item.prerequisiteModuleIds
        }
      })
      setAssignmentLockStatus(lockMap)
    }
    
    loadLockStatus()
  }, [currentCourse?.id, currentUser?.id, isInstructor, assignments])

  // Load prerequisites when opening manage access dialog
  useEffect(() => {
    async function loadPrerequisites() {
      if (accessAssignmentId && manageAccessOpen) {
        const prereqs = await getAssignmentPrerequisites(accessAssignmentId)
        setSelectedPrerequisiteModuleIds(prereqs)
      }
    }
    loadPrerequisites()
  }, [accessAssignmentId, manageAccessOpen])

  const getSubmissionForAssignment = (assignmentId: string): Submission | undefined => {
    return submissions.find(s => s.assignment_id === assignmentId)
  }

  const getStatusBadge = (assignment: Assignment) => {
    const submission = getSubmissionForAssignment(assignment.id)
    
    if (submission?.status === 'graded') {
      return (
        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          Graded: {submission.grade}/{assignment.points}
        </span>
      )
    }
    
    if (submission?.status === 'submitted') {
      const isLate = submission.is_late
      return (
        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
          isLate 
            ? 'text-orange-400 bg-orange-400/10' 
            : 'text-blue-400 bg-blue-400/10'
        }`}>
          {isLate ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {isLate ? 'Submitted Late' : 'Submitted'}
        </span>
      )
    }
    
    const dueDate = new Date(assignment.due_date || '')
    const isPastDue = dueDate < new Date()
    
    if (isPastDue) {
      return (
        <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
          <AlertCircle className="w-3 h-3" />
          Past Due
        </span>
      )
    }
    
    return (
      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] bg-white/5 px-2 py-1 rounded-full">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    )
  }

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return 'No due date'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSubmissionFile(file)
    }
  }

  const handleSubmit = async () => {
    if (!selectedAssignment || (!submissionContent.trim() && !submissionFile)) return
    if (!currentUser) return
    
    setIsSubmitting(true)
    
    let fileUrl: string | undefined
    
    // Upload file if present
    if (submissionFile) {
      setUploadingFile(true)
      const result = await uploadAttachment(submissionFile, currentUser.id)
      setUploadingFile(false)
      
      if (result.success && result.url) {
        fileUrl = result.url
      } else {
        alert('Failed to upload file: ' + result.error)
        setIsSubmitting(false)
        return
      }
    }
    
    const success = await submitAssignment(selectedAssignment.id, submissionContent.trim(), fileUrl)
    
    if (success) {
      setSelectedAssignment(null)
      setSubmissionContent("")
      setSubmissionFile(null)
    }
    
    setIsSubmitting(false)
  }

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setAttachmentFiles(prev => [...prev, ...Array.from(files)])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    if (!newTitle.trim() || !currentUser || !currentCourse) return
    setCreating(true)

    try {
      // Upload attachments first
      let attachmentUrls: string[] = []
      if (attachmentFiles.length > 0) {
        setUploadingAttachments(true)
        for (const file of attachmentFiles) {
          const result = await uploadAttachment(file, currentUser.id)
          if (result.success && result.url) {
            attachmentUrls.push(result.url)
          }
        }
        setUploadingAttachments(false)
      }

      const assignment = await createAssignment({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        points: Number.isFinite(Number(newPoints)) ? Number(newPoints) : 100,
        type: 'reflection',
        attachments: attachmentUrls,
      })

      if (!assignment) {
        alert("Failed to create assignment. Check Supabase tables and RLS.")
        setCreating(false)
        return
      }

      // Close create dialog and open publish dialog
      setCreateOpen(false)
      setNewTitle("")
      setNewDescription("")
      setNewDueDate("")
      setNewPoints("100")
      setAttachmentFiles([])
      
      // Open publish dialog for the newly created assignment
      setPendingAssignmentId(assignment.id)
      setPublishStep('choose')
      setPublishDialogOpen(true)
      
      // Pre-fetch students for potential restricted access selection
      const students = await getCourseStudents(currentCourse.id)
      setCourseStudents(students)
      setAssignedStudentIds([])
    } catch (err) {
      alert(`Error creating assignment: ${String(err)}`)
    } finally {
      setCreating(false)
    }
  }
  
  // Handle publish dialog actions for assignments
  const handlePublishAssignmentToAll = async () => {
    if (!pendingAssignmentId) return
    setPublishingAssignment(true)
    
    try {
      await updateAssignment(pendingAssignmentId, { is_published: true, is_restricted: false })
      refetch()
      setPublishDialogOpen(false)
      setPendingAssignmentId(null)
    } catch (err) {
      alert(`Error publishing assignment: ${String(err)}`)
    } finally {
      setPublishingAssignment(false)
    }
  }
  
  const handleRestrictAssignmentAccess = () => {
    // Move to student selection step
    setPublishStep('select-students')
  }
  
  const handleFinishRestrictedAssignment = async () => {
    if (!pendingAssignmentId) return
    setPublishingAssignment(true)
    
    try {
      // Set assignment as published + restricted
      await updateAssignment(pendingAssignmentId, { is_published: true, is_restricted: true })
      
      // Assign selected students
      for (const studentId of assignedStudentIds) {
        await assignAssignmentToStudent(pendingAssignmentId, studentId)
      }
      
      refetch()
      setPublishDialogOpen(false)
      setPendingAssignmentId(null)
      setAssignedStudentIds([])
    } catch (err) {
      alert(`Error setting restricted access: ${String(err)}`)
    } finally {
      setPublishingAssignment(false)
    }
  }
  
  const handleToggleStudentForNewAssignment = (studentId: string) => {
    setAssignedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleOpenManageAccess = async (assignmentId: string) => {
    setAccessAssignmentId(assignmentId)
    setManageAccessOpen(true)
    
    if (currentCourse?.id) {
      const students = await getCourseStudents(currentCourse.id)
      setCourseStudents(students)
      
      const targets = await getAssignmentTargets(assignmentId)
      setAssignedStudentIds(targets)
    }
  }

  const handleToggleAssignment = async (studentId: string) => {
    if (!accessAssignmentId) return
    
    const isAssigned = assignedStudentIds.includes(studentId)
    setUpdatingAccess(true)
    
    try {
      if (isAssigned) {
        const success = await unassignAssignmentFromStudent(accessAssignmentId, studentId)
        if (success) {
          setAssignedStudentIds(prev => prev.filter(id => id !== studentId))
        }
      } else {
        const success = await assignAssignmentToStudent(accessAssignmentId, studentId)
        if (success) {
          setAssignedStudentIds(prev => [...prev, studentId])
        }
      }
    } catch (error) {
      console.error('Toggle assignment error:', error)
    } finally {
      setUpdatingAccess(false)
    }
  }

  const handleToggleRestricted = async (restricted: boolean) => {
    if (!accessAssignmentId) return
    await updateAssignment(accessAssignmentId, { is_restricted: restricted })
    refetch()
  }

  const handleTogglePublished = async (published: boolean) => {
    if (!accessAssignmentId) return
    const ok = await updateAssignment(accessAssignmentId, { is_published: published })
    refetch()
  }

  const handleTogglePrerequisite = (moduleId: string) => {
    setSelectedPrerequisiteModuleIds(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const handleSavePrerequisites = async () => {
    if (!accessAssignmentId) return
    
    setSavingPrerequisites(true)
    try {
      const success = await setAssignmentPrerequisites(accessAssignmentId, selectedPrerequisiteModuleIds)
      if (!success) {
        alert('Failed to save prerequisites')
      }
    } catch (error) {
      console.error('Save prerequisites error:', error)
      alert('Failed to save prerequisites')
    } finally {
      setSavingPrerequisites(false)
    }
  }

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return
    
    setDeletingAssignment(true)
    try {
      const success = await deleteAssignmentUtil(assignmentToDelete.id)
      if (success) {
        setDeleteAssignmentOpen(false)
        setAssignmentToDelete(null)
        // Clear selection if deleted assignment was selected
        if (selectedAssignment?.id === assignmentToDelete.id) {
          setSelectedAssignment(null)
        }
        refetch()
      } else {
        alert('Failed to delete assignment')
      }
    } catch (error) {
      console.error('Delete assignment error:', error)
      alert('Failed to delete assignment')
    } finally {
      setDeletingAssignment(false)
    }
  }

  const openDeleteAssignmentDialog = (assignment: Assignment) => {
    setAssignmentToDelete(assignment)
    setDeleteAssignmentOpen(true)
  }

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4" />
    }
    return <File className="w-4 h-4" />
  }

  const getFileName = (url: string) => {
    const parts = url.split('/')
    return parts[parts.length - 1].split('?')[0] || 'File'
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

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Assignments</h1>
            <p className="text-[var(--text-muted)]">
              {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} in this course
            </p>
          </div>
          {isInstructor && (
            <Button
              variant="glass-theme"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <FileUp className="w-4 h-4 mr-2" />
              Create Assignment
            </Button>
          )}
        </div>

        {/* Assignments List */}
        {assignments.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Assignments Yet</h3>
            <p className="text-[var(--text-muted)]">
              {isInstructor 
                ? "Create your first assignment to get started"
                : "Your instructor hasn't posted any assignments yet"}
            </p>
            {isInstructor && (
              <Button variant="glass-theme" className="mt-4" onClick={() => setCreateOpen(true)}>
                <FileUp className="w-4 h-4 mr-2" />
                Create First Assignment
              </Button>
            )}
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const submission = getSubmissionForAssignment(assignment.id)
              const isLocked = !isInstructor && assignmentLockStatus[assignment.id]?.isLocked
              const prerequisiteModuleIds = assignmentLockStatus[assignment.id]?.prerequisiteModuleIds || []
              const prerequisiteModuleNames = prerequisiteModuleIds
                .map(id => modules.find(m => m.id === id)?.title)
                .filter(Boolean)
              const canSubmit = !submission && currentRole === 'student' && !isLocked
              const hasAttachments = (assignment.attachments?.length || 0) > 0
              // #region agent log
              console.log('[DEBUG] Assignment render:', { 
                id: assignment.id, 
                title: assignment.title, 
                attachments: assignment.attachments, 
                hasAttachments,
                isLocked,
                currentRole
              });
              // #endregion
              
              return (
                <GlassCard
                  key={assignment.id}
                  className={cn(
                    "p-4 transition-all",
                    isLocked && "opacity-60",
                    canSubmit && !isLocked ? 'hover:bg-white/[0.08] cursor-pointer' : ''
                  )}
                  onClick={() => canSubmit && !isLocked && setSelectedAssignment(assignment)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        isLocked ? "bg-yellow-500/20" : "bg-theme-gradient/20"
                      )}>
                        {isLocked ? (
                          <Lock className="w-5 h-5 text-yellow-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
                        )}
                      </div>
                      
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-white">{assignment.title}</h3>
                          {isLocked && (
                            <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
                              <Lock className="w-3 h-3" />
                              Locked
                            </span>
                          )}
                          {!isLocked && getStatusBadge(assignment)}
                          {assignment.is_restricted && (
                            <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded-full">
                              <Users className="w-3 h-3" />
                              Restricted
                            </span>
                          )}
                        </div>
                        
                        {isLocked ? (
                          <p className="text-sm text-yellow-400/70">
                            Complete {prerequisiteModuleNames.length > 1 ? 'modules' : 'module'}: {prerequisiteModuleNames.join(', ')} first
                          </p>
                        ) : (
                          <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                            {assignment.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          <span>Due: {formatDate(assignment.due_date)}</span>
                          <span>{assignment.points} points</span>
                        </div>

                        {/* Attachments from instructor - always visible to students */}
                        {hasAttachments && !isLocked && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {assignment.attachments?.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-[hsl(var(--theme-primary))] bg-[hsl(var(--theme-primary))]/10 px-2 py-1 rounded-lg hover:bg-[hsl(var(--theme-primary))]/20 transition-colors"
                              >
                                {getFileIcon(url)}
                                <span className="max-w-[100px] truncate">{getFileName(url)}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        )}

                        {submission?.feedback && (
                          <div className="mt-2 p-2 rounded-lg bg-green-400/10 border border-green-400/20">
                            <p className="text-xs text-green-400 font-medium mb-1">Instructor Feedback:</p>
                            <p className="text-sm text-white">{submission.feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isInstructor && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg hover:bg-white/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenManageAccess(assignment.id)
                            }}
                          >
                            <Settings2 className="w-4 h-4 text-[var(--text-muted)]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg hover:bg-red-500/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDeleteAssignmentDialog(assignment)
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </>
                      )}
                      {canSubmit && !isLocked && (
                        <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-auto m-4">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedAssignment.title}</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Due: {formatDate(selectedAssignment.due_date)} • {selectedAssignment.points} points
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedAssignment(null)
                  setSubmissionFile(null)
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-white mb-2">Assignment Description</h3>
                <p className="text-sm text-[var(--text-muted)]">{selectedAssignment.description}</p>
              </div>

              {/* Instructor attachments */}
              {(selectedAssignment.attachments?.length || 0) > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">Assignment Materials</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssignment.attachments?.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[hsl(var(--theme-primary))] bg-[hsl(var(--theme-primary))]/10 px-3 py-2 rounded-lg hover:bg-[hsl(var(--theme-primary))]/20 transition-colors"
                      >
                        {getFileIcon(url)}
                        <span className="max-w-[150px] truncate">{getFileName(url)}</span>
                        <Download className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-white mb-2 block">Your Submission</label>
                <textarea
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  placeholder="Write your response here..."
                  className="w-full h-48 p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
                />
              </div>

              {/* File upload dropbox */}
              <div>
                <label className="text-sm font-medium text-white mb-2 block">Attach File (Optional)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
                  className="hidden"
                />
                
                {submissionFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      {getFileIcon(submissionFile.name)}
                      <span className="text-sm text-white">{submissionFile.name}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        ({(submissionFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => setSubmissionFile(null)}
                      className="p-1 rounded hover:bg-white/10"
                    >
                      <X className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-[hsl(var(--theme-primary))]/50 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                      <Upload className="w-8 h-8" />
                      <span className="text-sm">Click or drag file to upload</span>
                      <span className="text-xs">PDF, DOC, TXT, or images up to 10MB</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-white/10">
              <Button variant="glass" onClick={() => {
                setSelectedAssignment(null)
                setSubmissionFile(null)
              }}>
                Cancel
              </Button>
              <Button
                variant="glass-theme"
                onClick={handleSubmit}
                disabled={(!submissionContent.trim() && !submissionFile) || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadingFile ? 'Uploading...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit Assignment
                  </>
                )}
              </Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Create Assignment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
            <DialogDescription>Create a new assignment for your students.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-[var(--text-muted)]">Title</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Week 1 Reflection"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-[var(--text-muted)]">Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What should the student submit?"
                rows={3}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-[var(--text-muted)]">Due Date <span className="opacity-60">(optional)</span></label>
                <input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[var(--text-muted)]">Points</label>
                <input
                  type="number"
                  min={0}
                  value={newPoints}
                  onChange={(e) => setNewPoints(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>
            </div>

            {/* Attachment upload */}
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Attachments (PDFs, Screenshots)</label>
              <input
                type="file"
                ref={attachmentInputRef}
                onChange={handleAttachmentSelect}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif"
                multiple
                className="hidden"
              />
              
              {attachmentFiles.length > 0 && (
                <div className="space-y-2">
                  {attachmentFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.name)}
                        <span className="text-sm text-white truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <button onClick={() => removeAttachment(idx)} className="p-1 hover:bg-white/10 rounded">
                        <X className="w-4 h-4 text-[var(--text-muted)]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <Button
                variant="glass"
                size="sm"
                className="w-full"
                onClick={() => attachmentInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Add Attachment
              </Button>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="glass" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              variant="glass-theme"
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingAttachments ? 'Uploading...' : 'Creating...'}
                </>
              ) : (
                'Create Assignment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Access Dialog */}
      <Dialog open={manageAccessOpen} onOpenChange={setManageAccessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Access</DialogTitle>
            <DialogDescription>
              Control which students can see this assignment.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white">Published</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Students only see published assignments.
                </div>
              </div>
              <Switch
                checked={assignments.find(a => a.id === accessAssignmentId)?.is_published || false}
                onCheckedChange={handleTogglePublished}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white">Restrict Access</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Only assigned students will see this assignment.
                </div>
              </div>
              <Switch
                checked={assignments.find(a => a.id === accessAssignmentId)?.is_restricted || false}
                onCheckedChange={handleToggleRestricted}
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
              <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {modules.length > 0 ? (
                  modules.map(mod => (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10"
                    >
                      <span className="text-sm text-white">{mod.title}</span>
                      <Switch
                        checked={selectedPrerequisiteModuleIds.includes(mod.id)}
                        onCheckedChange={() => handleTogglePrerequisite(mod.id)}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-2">
                    No modules created yet.
                  </p>
                )}
              </div>
              {modules.length > 0 && (
                <Button
                  variant="glass-theme"
                  size="sm"
                  onClick={handleSavePrerequisites}
                  disabled={savingPrerequisites}
                  className="w-full mt-2"
                >
                  {savingPrerequisites ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Prerequisites
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white px-1">Assign Students</h4>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
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
                        onCheckedChange={() => handleToggleAssignment(student.id)}
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
          </div>

          <DialogFooter className="mt-6">
            <Button variant="glass-theme" className="w-full" onClick={() => setManageAccessOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-create publish dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={(open) => {
        if (!open && !publishingAssignment) {
          setPublishDialogOpen(false)
          setPendingAssignmentId(null)
          setPublishStep('choose')
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {publishStep === 'choose' ? 'Publish Assignment' : 'Select Students'}
            </DialogTitle>
            <DialogDescription>
              {publishStep === 'choose' 
                ? 'Choose how students will access this assignment.'
                : 'Select which students can access this assignment.'}
            </DialogDescription>
          </DialogHeader>

          {publishStep === 'choose' ? (
            <div className="mt-4 space-y-3">
              <button
                onClick={handlePublishAssignmentToAll}
                disabled={publishingAssignment}
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Publish to all students</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      All enrolled students will see this assignment
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={handleRestrictAssignmentAccess}
                disabled={publishingAssignment}
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Restrict to specific students</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Only selected students will see this assignment
                    </div>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
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
                        checked={assignedStudentIds.includes(student.id)}
                        onCheckedChange={() => handleToggleStudentForNewAssignment(student.id)}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">
                    No students enrolled yet.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="glass" onClick={() => setPublishStep('choose')} disabled={publishingAssignment}>
                  Back
                </Button>
                <Button
                  variant="glass-theme"
                  onClick={handleFinishRestrictedAssignment}
                  disabled={publishingAssignment || assignedStudentIds.length === 0}
                >
                  {publishingAssignment ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Publish ({assignedStudentIds.length} selected)
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Assignment Confirmation Dialog */}
      <Dialog open={deleteAssignmentOpen} onOpenChange={setDeleteAssignmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Delete Assignment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{assignmentToDelete?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300">
              This will permanently delete:
            </p>
            <ul className="mt-2 text-sm text-[var(--text-muted)] list-disc list-inside space-y-1">
              <li>The assignment and all its settings</li>
              <li>All student submissions for this assignment</li>
              <li>All grades and feedback</li>
            </ul>
          </div>

          <DialogFooter className="mt-6">
            <Button 
              variant="glass" 
              onClick={() => {
                setDeleteAssignmentOpen(false)
                setAssignmentToDelete(null)
              }}
              disabled={deletingAssignment}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAssignment}
              disabled={deletingAssignment}
              className="bg-red-500 hover:bg-red-600"
            >
              {deletingAssignment ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
