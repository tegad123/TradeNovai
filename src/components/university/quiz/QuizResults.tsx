"use client"

import { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Trophy,
  Target,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/glass/GlassCard'
import { getQuizAttempt, getQuizWithQuestions } from '@/lib/supabase/universityUtils'
import type { 
  QuizAttempt, 
  QuizWithQuestions, 
  QuizResponse,
  QuizQuestion,
  QuizQuestionOption
} from '@/lib/types/quiz'

interface QuizResultsProps {
  attemptId: string
  onBack?: () => void
  onRetake?: () => void
}

interface ResponseWithDetails extends QuizResponse {
  question: QuizQuestion
  selected_option: QuizQuestionOption | null
}

export function QuizResults({ attemptId, onBack, onRetake }: QuizResultsProps) {
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null)
  const [responses, setResponses] = useState<ResponseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true)
        const attemptData = await getQuizAttempt(attemptId)
        if (attemptData) {
          setAttempt(attemptData)
          setResponses((attemptData.responses || []) as ResponseWithDetails[])
          
          // Load quiz for settings
          const quizData = await getQuizWithQuestions(attemptData.quiz_id)
          setQuiz(quizData)
        }
      } catch (err) {
        console.error('Error loading results:', err)
        setError('Failed to load quiz results')
      } finally {
        setLoading(false)
      }
    }
    loadResults()
  }, [attemptId])

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
        <p className="mt-4 text-[var(--text-muted)]">Loading results...</p>
      </GlassCard>
    )
  }

  if (error || !attempt) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-red-400">{error || 'Results not found'}</p>
        {onBack && (
          <Button variant="glass" className="mt-4" onClick={onBack}>
            Go Back
          </Button>
        )}
      </GlassCard>
    )
  }

  const passed = (attempt.score_percentage || 0) >= (quiz?.passing_score || 70)
  const showAnswers = quiz?.show_correct_answers !== false

  const correctCount = responses.filter(r => r.is_correct).length
  const incorrectCount = responses.filter(r => r.is_correct === false).length
  const pendingCount = responses.filter(r => r.is_correct === null).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <h2 className="text-xl font-bold text-white">Quiz Results</h2>
        {onRetake && (
          <Button variant="ghost" size="sm" onClick={onRetake}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retake Quiz
          </Button>
        )}
      </div>

      {/* Score Card */}
      <GlassCard className="p-8">
        <div className="text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
            passed ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {passed ? (
              <Trophy className="w-12 h-12 text-green-400" />
            ) : (
              <Target className="w-12 h-12 text-red-400" />
            )}
          </div>
          
          <p className="text-5xl font-bold text-white mb-2">
            {attempt.score_percentage}%
          </p>
          
          <p className={`text-xl font-semibold mb-4 ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {passed ? 'Congratulations! You Passed!' : 'Not Passed'}
          </p>
          
          <p className="text-[var(--text-muted)]">
            Score: {attempt.score} points • Passing: {quiz?.passing_score || 70}%
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-green-400 mb-1">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-2xl font-bold">{correctCount}</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">Correct</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-red-400 mb-1">
              <XCircle className="w-5 h-5" />
              <span className="text-2xl font-bold">{incorrectCount}</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">Incorrect</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-[var(--text-muted)] mb-1">
              <Clock className="w-5 h-5" />
              <span className="text-2xl font-bold">{formatTime(attempt.time_spent_seconds)}</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">Time</p>
          </div>
        </div>
        
        {pendingCount > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-400 text-center">
              {pendingCount} question(s) are pending instructor review
            </p>
          </div>
        )}
      </GlassCard>

      {/* Question Review */}
      {showAnswers && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Question Review</h3>
          
          {responses.map((response, index) => {
            const question = response.question
            const isShortAnswer = question?.question_type === 'short_answer'
            
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
                     <Clock className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* Question */}
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">Question {index + 1}</p>
                      <p className="text-white mt-1">{question?.question_text}</p>
                    </div>

                    {/* Your answer */}
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">Your Answer</p>
                      {isShortAnswer ? (
                        <p className={`mt-1 p-3 rounded-lg ${
                          response.is_correct === true ? 'bg-green-500/10' :
                          response.is_correct === false ? 'bg-red-500/10' :
                          'bg-white/5'
                        }`}>
                          {response.text_response || <em className="text-[var(--text-muted)]">No answer provided</em>}
                        </p>
                      ) : (
                        <p className={`mt-1 ${
                          response.is_correct ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {response.selected_option?.option_text || <em className="text-[var(--text-muted)]">No answer selected</em>}
                        </p>
                      )}
                    </div>

                    {/* Correct answer (for MC/TF) */}
                    {!isShortAnswer && !response.is_correct && question?.options && (
                      <div>
                        <p className="text-sm text-[var(--text-muted)]">Correct Answer</p>
                        <p className="text-green-400 mt-1">
                          {question.options.find(o => o.is_correct)?.option_text}
                        </p>
                      </div>
                    )}

                    {/* Instructor feedback */}
                    {response.instructor_feedback && (
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-sm text-blue-400">Instructor Feedback:</p>
                        <p className="text-white mt-1">{response.instructor_feedback}</p>
                      </div>
                    )}

                    {/* Points */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
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
      )}
    </div>
  )
}
