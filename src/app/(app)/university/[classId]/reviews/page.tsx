"use client"

import { useState } from "react"
import {
  FileText,
  LineChart,
  Send,
  Loader2,
  CheckCircle2,
  X,
  Star,
  MessageSquare,
  AlertCircle,
} from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"
import { useUniversity } from "@/lib/contexts/UniversityContext"
import { useUniversityAssignments } from "@/lib/hooks/useUniversityAssignments"
import { useUniversityTradeLogs } from "@/lib/hooks/useUniversityTradeLogs"
import type { Submission, UniversityTradeLog } from "@/lib/supabase/universityUtils"

interface PageProps {
  params: { classId: string }
}

type ReviewTab = 'assignments' | 'trade-logs'

export default function ReviewsPage({ params }: PageProps) {
  const { classId } = params
  const { currentRole } = useUniversity()
  const { 
    assignments, 
    submissions, 
    loading: assignmentsLoading, 
    gradeSubmission 
  } = useUniversityAssignments(classId, currentRole)
  const { 
    tradeLogs, 
    isLoading: logsLoading, 
    addFeedback 
  } = useUniversityTradeLogs(classId, currentRole)

  const [activeTab, setActiveTab] = useState<ReviewTab>('assignments')
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [selectedTradeLog, setSelectedTradeLog] = useState<UniversityTradeLog | null>(null)
  const [grade, setGrade] = useState<number | ''>('')
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isLoading = assignmentsLoading || logsLoading

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

  const pendingSubmissions = submissions.filter(s => s.status === 'submitted')
  const pendingTradeLogs = tradeLogs.filter(l => !l.instructor_feedback)
  
  // #region agent log
  console.log('[DEBUG] Reviews page submissions:', { 
    totalSubmissions: submissions.length,
    pendingCount: pendingSubmissions.length,
    submissionDetails: submissions.map(s => ({ 
      id: s.id, 
      file_url: s.file_url, 
      attachments: s.attachments,
      status: s.status
    }))
  });
  // #endregion

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || grade === '' || !feedback.trim()) return

    setIsSubmitting(true)
    const success = await gradeSubmission(selectedSubmission.id, Number(grade), feedback.trim())
    
    if (success) {
      setSelectedSubmission(null)
      setGrade('')
      setFeedback("")
    }
    
    setIsSubmitting(false)
  }

  const handleAddFeedback = async () => {
    if (!selectedTradeLog || !feedback.trim()) return

    setIsSubmitting(true)
    const success = await addFeedback(selectedTradeLog.id, feedback.trim())
    
    if (success) {
      setSelectedTradeLog(null)
      setFeedback("")
    }
    
    setIsSubmitting(false)
  }

  const getAssignmentById = (id: string) => {
    return assignments.find(a => a.id === id)
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Reviews & Grading</h1>
          <p className="text-[var(--text-muted)]">
            Review student submissions and provide feedback
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'assignments'
                ? 'bg-theme-gradient text-white'
                : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Assignments
              {pendingSubmissions.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[hsl(var(--theme-primary))] text-xs flex items-center justify-center text-white">
                  {pendingSubmissions.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('trade-logs')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'trade-logs'
                ? 'bg-theme-gradient text-white'
                : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2">
              <LineChart className="w-4 h-4" />
              Trade Logs
              {pendingTradeLogs.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[hsl(var(--theme-primary))] text-xs flex items-center justify-center text-white">
                  {pendingTradeLogs.length}
                </span>
              )}
            </span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {pendingSubmissions.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">All Caught Up!</h3>
                <p className="text-[var(--text-muted)]">
                  No pending assignment submissions to review
                </p>
              </GlassCard>
            ) : (
              pendingSubmissions.map((submission) => {
                const assignment = getAssignmentById(submission.assignment_id)
                const hasAttachment = submission.file_url || (submission.attachments && submission.attachments.length > 0)
                return (
                  <GlassCard
                    key={submission.id}
                    className="p-4 hover:bg-white/[0.08] transition-colors cursor-pointer"
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">
                            {submission.student_name || 'Student'}
                          </h3>
                          <p className="text-sm text-[var(--text-muted)]">
                            {assignment?.title || 'Assignment'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-[var(--text-muted)]">
                              Submitted: {formatDate(submission.submitted_at)}
                            </p>
                            {hasAttachment && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--theme-primary))]/20 text-[hsl(var(--theme-primary))] text-xs">
                                <FileText className="w-3 h-3" />
                                File attached
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="glass-theme" size="sm">
                        Review
                      </Button>
                    </div>
                  </GlassCard>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'trade-logs' && (
          <div className="space-y-4">
            {pendingTradeLogs.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">All Caught Up!</h3>
                <p className="text-[var(--text-muted)]">
                  No pending trade logs to review
                </p>
              </GlassCard>
            ) : (
              pendingTradeLogs.map((log) => (
                <GlassCard
                  key={log.id}
                  className="p-4 hover:bg-white/[0.08] transition-colors cursor-pointer"
                  onClick={() => setSelectedTradeLog(log)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                        <LineChart className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">
                          {log.student_name || 'Student'}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                          {log.reflection}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Trade date: {formatDate(log.trade_date)}
                        </p>
                      </div>
                    </div>
                    <Button variant="glass-theme" size="sm">
                      Review
                    </Button>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        )}
      </div>

      {/* Grade Submission Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-auto m-4">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">Grade Submission</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {selectedSubmission.student_name} • {getAssignmentById(selectedSubmission.assignment_id)?.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Student's Submission */}
              <div>
                <h3 className="text-sm font-medium text-white mb-2">Student&apos;s Submission</h3>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white whitespace-pre-wrap">{selectedSubmission.content}</p>
                </div>
              </div>

              {/* Student's Attachment */}
              {selectedSubmission.file_url && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">Attached File</h3>
                  <a
                    href={selectedSubmission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[hsl(var(--theme-primary))] hover:bg-white/10 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    View Attachment
                  </a>
                </div>
              )}

              {/* Student's Additional Attachments */}
              {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">Additional Attachments</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubmission.attachments.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[hsl(var(--theme-primary))] hover:bg-white/10 transition-colors text-sm"
                      >
                        <FileText className="w-3 h-3" />
                        Attachment {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Grade Input */}
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Grade (out of {getAssignmentById(selectedSubmission.assignment_id)?.points || 100})
                </label>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
                  <input
                    type="number"
                    min="0"
                    max={getAssignmentById(selectedSubmission.assignment_id)?.points || 100}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Enter grade"
                    className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                  />
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="text-sm font-medium text-white mb-2 block">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide constructive feedback for the student..."
                  className="w-full h-32 p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-white/10">
              <Button variant="glass" onClick={() => setSelectedSubmission(null)}>
                Cancel
              </Button>
              <Button
                variant="glass-theme"
                onClick={handleGradeSubmission}
                disabled={grade === '' || !feedback.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit Grade
                  </>
                )}
              </Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Trade Log Feedback Modal */}
      {selectedTradeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-auto m-4">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">Add Feedback</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {selectedTradeLog.student_name} • {formatDate(selectedTradeLog.trade_date)}
                </p>
              </div>
              <button
                onClick={() => setSelectedTradeLog(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Student's Reflection */}
              <div>
                <h3 className="text-sm font-medium text-white mb-2">Student&apos;s Reflection</h3>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white whitespace-pre-wrap">{selectedTradeLog.reflection}</p>
                </div>
              </div>

              {/* Screenshots */}
              {(selectedTradeLog.screenshot_url || (selectedTradeLog.screenshots && selectedTradeLog.screenshots.length > 0)) && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">Screenshots</h3>
                  <div className="flex gap-2 flex-wrap">
                    {selectedTradeLog.screenshot_url && (
                      <a
                        href={selectedTradeLog.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-white/5 border border-white/10 overflow-hidden hover:border-[hsl(var(--theme-primary))] transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedTradeLog.screenshot_url} alt="Trade screenshot" className="max-w-xs h-auto object-cover" />
                      </a>
                    )}
                    {selectedTradeLog.screenshots?.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-20 h-20 rounded-lg bg-white/5 border border-white/10 overflow-hidden hover:border-[hsl(var(--theme-primary))] transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              <div>
                <label className="text-sm font-medium text-white mb-2 block">Your Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide coaching feedback on the student's trading reflection..."
                  className="w-full h-32 p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-white/10">
              <Button variant="glass" onClick={() => setSelectedTradeLog(null)}>
                Cancel
              </Button>
              <Button
                variant="glass-theme"
                onClick={handleAddFeedback}
                disabled={!feedback.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </PageContainer>
  )
}
