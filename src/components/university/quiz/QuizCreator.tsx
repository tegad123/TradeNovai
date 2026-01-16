"use client"

import { useState, useCallback } from 'react'
import { 
  Plus, 
  Save, 
  ArrowLeft,
  Clock,
  Target,
  RefreshCw,
  Shuffle,
  Eye,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/glass/GlassCard'
import { Switch } from '@/components/ui/switch'
import { QuestionEditor } from './QuestionEditor'
import { 
  createQuiz, 
  updateQuiz, 
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion as deleteQuestionFromDb,
  createQuestionOption,
  getQuizWithQuestions
} from '@/lib/supabase/universityUtils'
import type { 
  Quiz, 
  QuizWithQuestions, 
  CreateQuizData, 
  CreateQuestionData,
  QuestionType
} from '@/lib/types/quiz'

interface QuizCreatorProps {
  courseId: string
  existingQuiz?: QuizWithQuestions | null
  onSave?: (quiz: Quiz) => void
  onCancel?: () => void
}

export function QuizCreator({ courseId, existingQuiz, onSave, onCancel }: QuizCreatorProps) {
  const [title, setTitle] = useState(existingQuiz?.title || '')
  const [description, setDescription] = useState(existingQuiz?.description || '')
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(existingQuiz?.time_limit_minutes || null)
  const [pointsPossible, setPointsPossible] = useState(existingQuiz?.points_possible || 100)
  const [passingScore, setPassingScore] = useState(existingQuiz?.passing_score || 70)
  const [maxAttempts, setMaxAttempts] = useState<number | null>(existingQuiz?.max_attempts || 1)
  const [shuffleQuestions, setShuffleQuestions] = useState(existingQuiz?.shuffle_questions || false)
  const [shuffleOptions, setShuffleOptions] = useState(existingQuiz?.shuffle_options || false)
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(existingQuiz?.show_correct_answers ?? true)
  
  const [questions, setQuestions] = useState<CreateQuestionData[]>(
    existingQuiz?.questions?.map(q => ({
      question_text: q.question_text,
      question_type: q.question_type as QuestionType,
      points: q.points,
      order: q.order,
      correct_answer_text: q.correct_answer_text,
      options: q.options?.map(o => ({
        option_text: o.option_text,
        is_correct: o.is_correct,
        order: o.order
      }))
    })) || []
  )
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddQuestion = () => {
    const newQuestion: CreateQuestionData = {
      question_text: '',
      question_type: 'multiple_choice',
      points: 10,
      order: questions.length,
      options: [
        { option_text: '', is_correct: true, order: 0 },
        { option_text: '', is_correct: false, order: 1 }
      ]
    }
    setQuestions([...questions, newQuestion])
  }

  const handleQuestionChange = (index: number, question: CreateQuestionData) => {
    const newQuestions = [...questions]
    newQuestions[index] = question
    setQuestions(newQuestions)
  }

  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const calculateTotalPoints = () => {
    return questions.reduce((sum, q) => sum + (q.points || 0), 0)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a quiz title')
      return
    }

    if (questions.length === 0) {
      setError('Please add at least one question')
      return
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text.trim()) {
        setError(`Question ${i + 1} is empty`)
        return
      }
      if (q.question_type !== 'short_answer') {
        if (!q.options || q.options.length < 2) {
          setError(`Question ${i + 1} needs at least 2 options`)
          return
        }
        if (!q.options.some(o => o.is_correct)) {
          setError(`Question ${i + 1} needs a correct answer`)
          return
        }
        if (q.options.some(o => !o.option_text.trim())) {
          setError(`Question ${i + 1} has empty options`)
          return
        }
      }
    }

    try {
      setSaving(true)
      setError(null)

      const quizData: CreateQuizData = {
        title,
        description: description || undefined,
        time_limit_minutes: timeLimitMinutes,
        points_possible: calculateTotalPoints(),
        passing_score: passingScore,
        max_attempts: maxAttempts,
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
        show_correct_answers: showCorrectAnswers
      }

      let quiz: Quiz | null

      if (existingQuiz) {
        // Update existing quiz
        await updateQuiz(existingQuiz.id, quizData)
        
        // For simplicity, delete all existing questions and recreate
        // In production, you'd want to do a proper diff
        if (existingQuiz.questions) {
          for (const q of existingQuiz.questions) {
            await deleteQuestionFromDb(q.id)
          }
        }
        
        // Create new questions
        for (const q of questions) {
          await createQuizQuestion(existingQuiz.id, q)
        }
        
        quiz = { ...existingQuiz, ...quizData }
      } else {
        // Create new quiz
        quiz = await createQuiz(courseId, quizData)
        
        if (quiz) {
          // Create questions
          for (const q of questions) {
            await createQuizQuestion(quiz.id, q)
          }
        }
      }

      if (quiz && onSave) {
        onSave(quiz)
      }
    } catch (err) {
      console.error('Error saving quiz:', err)
      setError(err instanceof Error ? err.message : 'Failed to save quiz')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <h2 className="text-xl font-bold text-white">
            {existingQuiz ? 'Edit Quiz' : 'Create Quiz'}
          </h2>
        </div>
        
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Quiz
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Quiz Settings */}
      <GlassCard className="p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white">Quiz Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quiz title..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter quiz description..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
            />
          </div>

          {/* Time Limit */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Time Limit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={timeLimitMinutes || ''}
                onChange={(e) => setTimeLimitMinutes(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="No limit"
                min="1"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
              />
              <span className="text-sm text-[var(--text-muted)]">minutes</span>
            </div>
          </div>

          {/* Max Attempts */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              <RefreshCw className="w-4 h-4 inline mr-1" />
              Max Attempts
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={maxAttempts || ''}
                onChange={(e) => setMaxAttempts(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Unlimited"
                min="1"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
              />
              <span className="text-sm text-[var(--text-muted)]">attempts</span>
            </div>
          </div>

          {/* Passing Score */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              <Target className="w-4 h-4 inline mr-1" />
              Passing Score
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
                min="0"
                max="100"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
              />
              <span className="text-sm text-[var(--text-muted)]">%</span>
            </div>
          </div>

          {/* Total Points Display */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              Total Points
            </label>
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
              {calculateTotalPoints()} points
            </div>
          </div>
        </div>

        {/* Toggle Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-white">Shuffle Questions</span>
            </div>
            <Switch 
              checked={shuffleQuestions} 
              onCheckedChange={setShuffleQuestions} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-white">Shuffle Options</span>
            </div>
            <Switch 
              checked={shuffleOptions} 
              onCheckedChange={setShuffleOptions} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-white">Show Correct Answers</span>
            </div>
            <Switch 
              checked={showCorrectAnswers} 
              onCheckedChange={setShowCorrectAnswers} 
            />
          </div>
        </div>
      </GlassCard>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Questions ({questions.length})
          </h3>
          <Button variant="glass" size="sm" onClick={handleAddQuestion}>
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>

        {questions.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-[var(--text-muted)]">No questions yet. Add your first question to get started.</p>
            <Button variant="glass" className="mt-4" onClick={handleAddQuestion}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionEditor
                key={index}
                question={question}
                index={index}
                onChange={(q) => handleQuestionChange(index, q)}
                onDelete={() => handleDeleteQuestion(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
