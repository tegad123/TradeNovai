"use client"

import { useState } from "react"
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
} from "lucide-react"
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
import { useUniversityAssignments } from "@/lib/hooks/useUniversityAssignments"
import { useUniversity } from "@/lib/contexts/UniversityContext"
import type { Assignment, Submission } from "@/lib/university/types"

interface PageProps {
  params: { classId: string }
}

export default function AssignmentsPage({ params }: PageProps) {
  const { classId } = params
  const { currentRole } = useUniversity()
  const {
    assignments,
    submissions,
    loading: isLoading,
    submitAssignment,
    createAssignment,
  } = useUniversityAssignments(classId, currentRole)
  
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissionContent, setSubmissionContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newDueDate, setNewDueDate] = useState("")
  const [newPoints, setNewPoints] = useState("100")

  const isInstructor = currentRole === 'instructor'

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
      return (
        <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          Submitted
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

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'No due date'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const handleSubmit = async () => {
    if (!selectedAssignment || !submissionContent.trim()) return
    
    setIsSubmitting(true)
    
    const success = await submitAssignment(selectedAssignment.id, submissionContent.trim())
    
    if (success) {
      setSelectedAssignment(null)
      setSubmissionContent("")
    }
    
    setIsSubmitting(false)
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assignments/page.tsx:handleCreate',message:'submit create assignment',data:{courseId:classId,title:newTitle.trim(),hasDueDate:!!newDueDate,points:newPoints},timestamp:Date.now(),sessionId:'debug-session',runId:'assignments-create-v1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    let assignment: any = null
    try {
      assignment = await createAssignment({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        points: Number.isFinite(Number(newPoints)) ? Number(newPoints) : 100,
        type: 'reflection',
      })
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assignments/page.tsx:handleCreate',message:'createAssignment threw',data:{error:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'assignments-create-v2',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      alert(`Error creating assignment: ${String(err)}`)
      setCreating(false)
      return
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assignments/page.tsx:handleCreate',message:'create assignment result',data:{success:!!assignment,assignmentId:assignment?.id||null},timestamp:Date.now(),sessionId:'debug-session',runId:'assignments-create-v2',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    if (!assignment) {
      alert("Failed to create assignment. This is usually caused by missing Supabase tables (run 003_university_tables.sql) or RLS blocking inserts.")
      setCreating(false)
      return
    }

    setCreateOpen(false)
    setNewTitle("")
    setNewDescription("")
    setNewDueDate("")
    setNewPoints("100")
    setCreating(false)
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
              onClick={() => {
                setCreateOpen(true)
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assignments/page.tsx:CreateAssignmentButton',message:'open create assignment dialog',data:{courseId:classId},timestamp:Date.now(),sessionId:'debug-session',runId:'assignments-create-v1',hypothesisId:'H1'})}).catch(()=>{});
                // #endregion
              }}
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
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const submission = getSubmissionForAssignment(assignment.id)
              const canSubmit = !submission && currentRole === 'student'
              
              return (
                <GlassCard
                  key={assignment.id}
                  className={`p-4 transition-all ${
                    canSubmit ? 'hover:bg-white/[0.08] cursor-pointer' : ''
                  }`}
                  onClick={() => canSubmit && setSelectedAssignment(assignment)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-theme-gradient/20 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{assignment.title}</h3>
                          {getStatusBadge(assignment)}
                        </div>
                        
                        <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                          {assignment.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          <span>Due: {formatDate(assignment.due_date)}</span>
                          <span>{assignment.points} points</span>
                        </div>

                        {submission?.feedback && (
                          <div className="mt-2 p-2 rounded-lg bg-green-400/10 border border-green-400/20">
                            <p className="text-xs text-green-400 font-medium mb-1">Instructor Feedback:</p>
                            <p className="text-sm text-white">{submission.feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {canSubmit && (
                      <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                    )}
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
                onClick={() => setSelectedAssignment(null)}
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

              <div>
                <label className="text-sm font-medium text-white mb-2 block">Your Submission</label>
                <textarea
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  placeholder="Write your response here..."
                  className="w-full h-48 p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <Button variant="glass" className="flex-1" disabled>
                  <Upload className="w-4 h-4 mr-2" />
                  Attach File (Coming Soon)
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-white/10">
              <Button variant="glass" onClick={() => setSelectedAssignment(null)}>
                Cancel
              </Button>
              <Button
                variant="glass-theme"
                onClick={handleSubmit}
                disabled={!submissionContent.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create assignment</DialogTitle>
            <DialogDescription>Create a new assignment for your students.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
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
              <label className="text-sm text-[var(--text-muted)]">Description (optional)</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What should the student submit?"
                rows={3}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-[var(--text-muted)]">Due date (optional)</label>
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
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

