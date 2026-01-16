"use client"

import { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertCircle,
  Save,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/glass/GlassCard'
import { getQuizAttempt, gradeShortAnswerResponse } from '@/lib/supabase/universityUtils'
import type { QuizAttempt, QuizQuestion, QuizQuestionOption, QuizResponse } from '@/lib/types/quiz'

interface StudentAttemptDetailProps {
  attemptId: string
  instructorId: string
  onBack?: () => void
}

interface ResponseWithDetails extends Omit<QuizResponse, 'question' | 'selected_option'> {
  question: QuizQuestion
  selected_option: QuizQuestionOption | null
}

export function StudentAttemptDetail({ attemptId, instructorId, onBack }: StudentAttemptDetailProps) {
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [responses, setResponses] = useState<ResponseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gradingResponse, setGradingResponse] = useState<string | null>(null)
  const [gradeData, setGradeData] = useState<Record<string, { points: number; feedback: string }>>({})

  useEffect(() => {
    async function loadAttempt() {
      try {
        setLoading(true)
        const data = await getQuizAttempt(attemptId)
        if (data) {
          setAttempt(data)
          setResponses((data.responses || []) as ResponseWithDetails[])
          
          // Initialize grade data for short answer questions
          const initialGradeData: Record<string, { points: number; feedback: string }> = {}
          for (const resp of (data.responses || []) as ResponseWithDetails[]) {
            if (resp.question?.question_type === 'short_answer') {
              initialGradeData[resp.id] = {
                points: resp.points_earned || 0,
                feedback: resp.instructor_feedback || ''
              }
            }
          }
          setGradeData(initialGradeData)
        }
      } catch (err) {
        console.error('Error loading attempt:', err)
        setError('Failed to load attempt details')
      } finally {
        setLoading(false)
      }
    }
    loadAttempt()
  }, [attemptId])

  const handleGradeResponse = async (responseId: string, questionPoints: number) => {
    const data = gradeData[responseId]
    if (!data) return

    try {
      setGradingResponse(responseId)
      const isCorrect = data.points >= questionPoints
      await gradeShortAnswerResponse(
        responseId,
        isCorrect,
        data.points,
        data.feedback || null,
        instructorId
      )
      
      // Update local state
      setResponses(prev => prev.map(r => 
        r.id === responseId 
          ? { ...r, is_correct: isCorrect, points_earned: data.points, instructor_feedback: data.feedback }
          : r
      ))
    } catch (err) {
      console.error('Error grading response:', err)
    } finally {
      setGradingResponse(null)
    }
  }

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[hsl(var(--theme-primary))] border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-[var(--text-muted)]">Loading attempt details...</p>
      </GlassCard>
    )
  }

  if (error || !attempt) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-red-400">{error || 'Attempt not found'}</p>
        {onBack && (
          <Button variant="glass" className="mt-4" onClick={onBack}>
            Go Back
          </Button>
        )}
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Results
          </Button>
        )}
        <h2 className="text-xl font-bold text-white">Attempt Details</h2>
      </div>

      {/* Attempt Summary */}
      <GlassCard className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Status</p>
            <div className="mt-1">
              {attempt.status === 'graded' ? (
                <span className="inline-flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Graded
                </span>
              ) : attempt.status === 'submitted' ? (
                <span className="inline-flex items-center gap-1 text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  Needs Grading
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-blue-400">
                  <Clock className="w-4 h-4" />
                  In Progress
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Score</p>
            <p className="text-xl font-bold text-white mt-1">
              {attempt.score_percentage !== null ? `${attempt.score_percentage}%` : '-'}
              <span className="text-sm text-[var(--text-muted)] font-normal ml-1">
                ({attempt.score || 0} pts)
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Time Spent</p>
            <p className="text-xl font-bold text-white mt-1">
              {formatTime(attempt.time_spent_seconds)}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Attempt #</p>
            <p className="text-xl font-bold text-white mt-1">
              {attempt.attempt_number}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Responses */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Responses</h3>
        
        {responses.map((response, index) => {
          const question = response.question
          const isShortAnswer = question?.question_type === 'short_answer'
          const needsGrading = isShortAnswer && response.is_correct === null

          return (
            <GlassCard key={response.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Status indicator */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  response.is_correct === true ? 'bg-green-500/20 text-green-400' :
                  response.is_correct === false ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {response.is_correct === true ? <CheckCircle2 className="w-5 h-5" /> :
                   response.is_correct === false ? <XCircle className="w-5 h-5" /> :
                   <AlertCircle className="w-5 h-5" />}
                </div>

                <div className="flex-1 space-y-3">
                  {/* Question */}
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Question {index + 1}</p>
                    <p className="text-white mt-1">{question?.question_text}</p>
                  </div>

                  {/* Answer */}
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Answer</p>
                    {isShortAnswer ? (
                      <p className="text-white mt-1 p-3 rounded-lg bg-white/5">
                        {response.text_response || <em className="text-[var(--text-muted)]">No answer provided</em>}
                      </p>
                    ) : (
                      <p className={`mt-1 ${response.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                        {response.selected_option?.option_text || <em className="text-[var(--text-muted)]">No answer selected</em>}
                      </p>
                    )}
                  </div>

                  {/* Short answer grading */}
                  {isShortAnswer && (
                    <div className="space-y-3 pt-3 border-t border-white/10">
                      {question?.correct_answer_text && (
                        <div>
                          <p className="text-sm text-[var(--text-muted)]">Reference Answer</p>
                          <p className="text-white/70 mt-1">{question.correct_answer_text}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-1">
                            Points (max: {question?.points})
                          </label>
                          <input
                            type="number"
                            value={gradeData[response.id]?.points ?? 0}
                            onChange={(e) => setGradeData(prev => ({
                              ...prev,
                              [response.id]: {
                                ...prev[response.id],
                                points: Math.min(parseInt(e.target.value) || 0, question?.points || 0)
                              }
                            }))}
                            min="0"
                            max={question?.points}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-1">
                            Feedback (optional)
                          </label>
                          <input
                            type="text"
                            value={gradeData[response.id]?.feedback ?? ''}
                            onChange={(e) => setGradeData(prev => ({
                              ...prev,
                              [response.id]: {
                                ...prev[response.id],
                                feedback: e.target.value
                              }
                            }))}
                            placeholder="Enter feedback..."
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                          />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleGradeResponse(response.id, question?.points || 0)}
                        disabled={gradingResponse === response.id}
                      >
                        {gradingResponse === response.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {needsGrading ? 'Save Grade' : 'Update Grade'}
                      </Button>

                      {response.instructor_feedback && !needsGrading && (
                        <div className="mt-2 p-2 rounded bg-white/5">
                          <p className="text-xs text-[var(--text-muted)]">Your feedback:</p>
                          <p className="text-sm text-white">{response.instructor_feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Points */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-[var(--text-muted)]">Points</span>
                    <span className={`font-semibold ${
                      response.points_earned === question?.points ? 'text-green-400' :
                      response.points_earned > 0 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {response.points_earned} / {question?.points}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
