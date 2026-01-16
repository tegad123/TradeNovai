"use client"

import { useState } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Send,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/glass/GlassCard'
import { QuizTimer } from './QuizTimer'
import { useQuizTaking } from '@/lib/hooks/useUniversityQuizzes'
import type { QuizWithQuestions, SubmitResponseData } from '@/lib/types/quiz'

interface QuizTakerProps {
  quizId: string
  studentId: string
  onComplete?: (score: number) => void
  onExit?: () => void
}

export function QuizTaker({ quizId, studentId, onComplete, onExit }: QuizTakerProps) {
  const {
    quiz,
    attempt,
    currentQuestionIndex,
    responses,
    timer,
    loading,
    submitting,
    error,
    startQuiz,
    selectAnswer,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    submitQuiz
  } = useQuizTaking({ quizId, studentId })

  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)

  // Pre-quiz screen
  if (!attempt && quiz) {
    return (
      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{quiz.title}</h2>
          {quiz.description && (
            <p className="text-[var(--text-muted)] mb-6">{quiz.description}</p>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-left mb-8">
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-[var(--text-muted)]">Questions</p>
              <p className="text-xl font-bold text-white">{quiz.questions?.length || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-[var(--text-muted)]">Points</p>
              <p className="text-xl font-bold text-white">{quiz.points_possible}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-[var(--text-muted)]">Time Limit</p>
              <p className="text-xl font-bold text-white">
                {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'Unlimited'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-[var(--text-muted)]">Passing Score</p>
              <p className="text-xl font-bold text-white">{quiz.passing_score}%</p>
            </div>
          </div>

          {quiz.time_limit_minutes && (
            <div className="flex items-start gap-2 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-left mb-6">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200">
                This quiz is timed. Once you start, you will have {quiz.time_limit_minutes} minutes to complete it.
                The quiz will automatically submit when time runs out.
              </p>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            {onExit && (
              <Button variant="ghost" onClick={onExit}>
                Cancel
              </Button>
            )}
            <Button onClick={startQuiz} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Start Quiz
            </Button>
          </div>
        </GlassCard>
      </div>
    )
  }

  // Loading state
  if (loading || !quiz) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[hsl(var(--theme-primary))] border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-[var(--text-muted)]">Loading quiz...</p>
      </GlassCard>
    )
  }

  // Error state
  if (error) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        {onExit && (
          <Button variant="glass" onClick={onExit}>
            Go Back
          </Button>
        )}
      </GlassCard>
    )
  }

  // Submitted state
  if (attempt?.status === 'submitted' || attempt?.status === 'graded') {
    return (
      <GlassCard className="p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Quiz Submitted!</h2>
        {attempt.score_percentage !== null && (
          <>
            <p className="text-4xl font-bold text-white mb-2">
              {attempt.score_percentage}%
            </p>
            <p className={`text-lg ${
              attempt.score_percentage >= (quiz.passing_score || 70) 
                ? 'text-green-400' 
                : 'text-red-400'
            }`}>
              {attempt.score_percentage >= (quiz.passing_score || 70) ? 'Passed!' : 'Not Passed'}
            </p>
          </>
        )}
        <div className="mt-6">
          {onComplete && (
            <Button onClick={() => onComplete(attempt.score_percentage || 0)}>
              View Results
            </Button>
          )}
        </div>
      </GlassCard>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const currentResponse = responses.get(currentQuestion?.id || '')
  const answeredCount = responses.size
  const totalQuestions = quiz.questions.length

  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion) return
    selectAnswer(currentQuestion.id, {
      question_id: currentQuestion.id,
      selected_option_id: optionId
    })
  }

  const handleTextResponse = (text: string) => {
    if (!currentQuestion) return
    selectAnswer(currentQuestion.id, {
      question_id: currentQuestion.id,
      text_response: text
    })
  }

  const handleSubmit = async () => {
    const result = await submitQuiz()
    if (result && onComplete) {
      onComplete(result.score_percentage || 0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with timer and progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--text-muted)]">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            ({answeredCount} answered)
          </span>
        </div>
        
        {timer && <QuizTimer timer={timer} />}
      </div>

      {/* Question navigation palette */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-2">
          {quiz.questions.map((q, idx) => {
            const isAnswered = responses.has(q.id)
            const isCurrent = idx === currentQuestionIndex
            
            return (
              <button
                key={q.id}
                onClick={() => goToQuestion(idx)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                  isCurrent
                    ? 'bg-[hsl(var(--theme-primary))] text-white'
                    : isAnswered
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10'
                }`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </GlassCard>

      {/* Current question */}
      {currentQuestion && (
        <GlassCard className="p-6">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  {currentQuestion.question_type.replace('_', ' ')}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  {currentQuestion.points} points
                </span>
              </div>
              <p className="text-lg text-white">{currentQuestion.question_text}</p>
            </div>

            {/* Options for MC/TF */}
            {(currentQuestion.question_type === 'multiple_choice' || 
              currentQuestion.question_type === 'true_false') && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option) => {
                  const isSelected = currentResponse?.selected_option_id === option.id
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                        isSelected
                          ? 'bg-[hsl(var(--theme-primary))]/20 border-[hsl(var(--theme-primary))]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected 
                          ? 'border-[hsl(var(--theme-primary))] bg-[hsl(var(--theme-primary))]' 
                          : 'border-white/30'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <span className="text-white">{option.option_text}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Text input for short answer */}
            {currentQuestion.question_type === 'short_answer' && (
              <textarea
                value={currentResponse?.text_response || ''}
                onChange={(e) => handleTextResponse(e.target.value)}
                placeholder="Type your answer here..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
              />
            )}
          </div>
        </GlassCard>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={prevQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex === totalQuestions - 1 ? (
            <Button
              onClick={() => setShowConfirmSubmit(true)}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Quiz
            </Button>
          ) : (
            <Button onClick={nextQuestion}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirm submit dialog */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <GlassCard className="p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Submit Quiz?</h3>
            <p className="text-[var(--text-muted)] mb-4">
              You have answered {answeredCount} of {totalQuestions} questions.
              {answeredCount < totalQuestions && (
                <span className="text-yellow-400 block mt-2">
                  Warning: {totalQuestions - answeredCount} question(s) are unanswered.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowConfirmSubmit(false)}>
                Review Answers
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Submit
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
