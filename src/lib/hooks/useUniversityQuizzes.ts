"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  getQuizzesByCourse,
  getQuizWithQuestions,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  createQuestionOption,
  updateQuestionOption,
  deleteQuestionOption,
  startQuizAttempt,
  getQuizAttempt,
  saveQuizResponse,
  submitQuizAttempt,
  getQuizAttempts,
  getStudentQuizAttempts,
  getQuizStats,
  type Quiz,
  type QuizWithQuestions,
  type QuizAttempt,
  type QuizStats
} from '@/lib/supabase/universityUtils'
import type {
  CreateQuizData,
  CreateQuestionData,
  CreateOptionData,
  SubmitResponseData,
  QuizTimerState
} from '@/lib/types/quiz'

interface UseUniversityQuizzesOptions {
  courseId: string
  role: 'student' | 'instructor' | null
}

interface UseUniversityQuizzesReturn {
  // Data
  quizzes: Quiz[]
  loading: boolean
  error: string | null
  
  // Quiz CRUD (instructor)
  createNewQuiz: (data: CreateQuizData) => Promise<Quiz | null>
  updateExistingQuiz: (quizId: string, data: Partial<CreateQuizData>) => Promise<boolean>
  deleteExistingQuiz: (quizId: string) => Promise<boolean>
  publishQuiz: (quizId: string, publish: boolean) => Promise<boolean>
  
  // Refresh
  refresh: () => void
}

export function useUniversityQuizzes({ courseId, role }: UseUniversityQuizzesOptions): UseUniversityQuizzesReturn {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuizzes = useCallback(async () => {
    if (!courseId) return
    
    try {
      setLoading(true)
      setError(null)
      const data = await getQuizzesByCourse(courseId)
      
      // Filter for students: only show published quizzes
      if (role === 'student') {
        setQuizzes(data.filter(q => q.is_published))
      } else {
        setQuizzes(data)
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err)
      setError('Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }, [courseId, role])

  useEffect(() => {
    fetchQuizzes()
  }, [fetchQuizzes])

  const createNewQuiz = useCallback(async (data: CreateQuizData): Promise<Quiz | null> => {
    try {
      const quiz = await createQuiz(courseId, data)
      if (quiz) {
        setQuizzes(prev => [quiz, ...prev])
      }
      return quiz
    } catch (err) {
      console.error('Error creating quiz:', err)
      throw err
    }
  }, [courseId])

  const updateExistingQuiz = useCallback(async (quizId: string, data: Partial<CreateQuizData>): Promise<boolean> => {
    const success = await updateQuiz(quizId, data)
    if (success) {
      setQuizzes(prev => prev.map(q => 
        q.id === quizId ? { ...q, ...data } : q
      ))
    }
    return success
  }, [])

  const deleteExistingQuiz = useCallback(async (quizId: string): Promise<boolean> => {
    const success = await deleteQuiz(quizId)
    if (success) {
      setQuizzes(prev => prev.filter(q => q.id !== quizId))
    }
    return success
  }, [])

  const publishQuiz = useCallback(async (quizId: string, publish: boolean): Promise<boolean> => {
    const success = await updateQuiz(quizId, { is_published: publish } as any)
    if (success) {
      setQuizzes(prev => prev.map(q => 
        q.id === quizId ? { ...q, is_published: publish } : q
      ))
    }
    return success
  }, [])

  return {
    quizzes,
    loading,
    error,
    createNewQuiz,
    updateExistingQuiz,
    deleteExistingQuiz,
    publishQuiz,
    refresh: fetchQuizzes
  }
}

// ============================================
// QUIZ TAKING HOOK (for students)
// ============================================

interface UseQuizTakingOptions {
  quizId: string
  studentId: string
}

interface UseQuizTakingReturn {
  // State
  quiz: QuizWithQuestions | null
  attempt: QuizAttempt | null
  currentQuestionIndex: number
  responses: Map<string, SubmitResponseData>
  timer: QuizTimerState | null
  loading: boolean
  submitting: boolean
  error: string | null
  
  // Actions
  startQuiz: () => Promise<void>
  selectAnswer: (questionId: string, response: SubmitResponseData) => void
  goToQuestion: (index: number) => void
  nextQuestion: () => void
  prevQuestion: () => void
  submitQuiz: () => Promise<QuizAttempt | null>
}

export function useQuizTaking({ quizId, studentId }: UseQuizTakingOptions): UseQuizTakingReturn {
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null)
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Map<string, SubmitResponseData>>(new Map())
  const [timer, setTimer] = useState<QuizTimerState | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load quiz data
  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true)
        const data = await getQuizWithQuestions(quizId)
        if (data) {
          // Shuffle questions if enabled
          if (data.shuffle_questions) {
            data.questions = shuffleArray(data.questions)
          }
          // Shuffle options if enabled
          if (data.shuffle_options) {
            data.questions = data.questions.map(q => ({
              ...q,
              options: shuffleArray(q.options)
            }))
          }
          setQuiz(data)
        }
      } catch (err) {
        console.error('Error loading quiz:', err)
        setError('Failed to load quiz')
      } finally {
        setLoading(false)
      }
    }
    loadQuiz()
  }, [quizId])

  // Timer effect
  useEffect(() => {
    if (!timer || !timer.is_running || timer.is_expired) return

    const interval = setInterval(() => {
      setTimer(prev => {
        if (!prev) return null
        const newRemaining = prev.remaining_seconds - 1
        if (newRemaining <= 0) {
          return { ...prev, remaining_seconds: 0, is_running: false, is_expired: true }
        }
        return { ...prev, remaining_seconds: newRemaining }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timer?.is_running])

  // Auto-submit when timer expires
  useEffect(() => {
    if (timer?.is_expired && attempt && !submitting) {
      submitQuiz()
    }
  }, [timer?.is_expired])

  const startQuiz = useCallback(async () => {
    if (!studentId) return
    
    try {
      setLoading(true)
      const newAttempt = await startQuizAttempt(quizId, studentId)
      if (newAttempt) {
        setAttempt(newAttempt)
        
        // Start timer if timed quiz
        if (quiz?.time_limit_minutes) {
          setTimer({
            remaining_seconds: quiz.time_limit_minutes * 60,
            is_running: true,
            is_expired: false
          })
        }
      }
    } catch (err) {
      console.error('Error starting quiz:', err)
      setError(err instanceof Error ? err.message : 'Failed to start quiz')
    } finally {
      setLoading(false)
    }
  }, [quizId, studentId, quiz?.time_limit_minutes])

  const selectAnswer = useCallback((questionId: string, response: SubmitResponseData) => {
    setResponses(prev => {
      const newMap = new Map(prev)
      newMap.set(questionId, response)
      return newMap
    })

    // Auto-save to server
    if (attempt) {
      saveQuizResponse(attempt.id, questionId, response).catch(console.error)
    }
  }, [attempt])

  const goToQuestion = useCallback((index: number) => {
    if (quiz && index >= 0 && index < quiz.questions.length) {
      setCurrentQuestionIndex(index)
    }
  }, [quiz])

  const nextQuestion = useCallback(() => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }, [quiz, currentQuestionIndex])

  const prevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }, [currentQuestionIndex])

  const submitQuiz = useCallback(async (): Promise<QuizAttempt | null> => {
    if (!attempt) return null
    
    try {
      setSubmitting(true)
      
      // Save all unsaved responses first
      for (const [questionId, response] of responses) {
        await saveQuizResponse(attempt.id, questionId, response)
      }
      
      // Submit and grade
      const result = await submitQuizAttempt(attempt.id)
      if (result) {
        setAttempt(result)
        setTimer(prev => prev ? { ...prev, is_running: false } : null)
      }
      return result
    } catch (err) {
      console.error('Error submitting quiz:', err)
      setError('Failed to submit quiz')
      return null
    } finally {
      setSubmitting(false)
    }
  }, [attempt, responses])

  return {
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
  }
}

// ============================================
// QUIZ RESULTS HOOK (for viewing results)
// ============================================

interface UseQuizResultsOptions {
  quizId: string
  role: 'student' | 'instructor' | null
  studentId?: string
}

interface UseQuizResultsReturn {
  attempts: QuizAttempt[]
  stats: QuizStats | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useQuizResults({ quizId, role, studentId }: UseQuizResultsOptions): UseQuizResultsReturn {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (role === 'instructor') {
        // Instructor sees all attempts
        const [attemptsData, statsData] = await Promise.all([
          getQuizAttempts(quizId),
          getQuizStats(quizId)
        ])
        setAttempts(attemptsData)
        setStats(statsData)
      } else if (role === 'student' && studentId) {
        // Student sees only their attempts
        const attemptsData = await getStudentQuizAttempts(quizId, studentId)
        setAttempts(attemptsData)
      }
    } catch (err) {
      console.error('Error fetching results:', err)
      setError('Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [quizId, role, studentId])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  return {
    attempts,
    stats,
    loading,
    error,
    refresh: fetchResults
  }
}

// Helper function
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
