"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { GlassCard } from '@/components/glass/GlassCard'
import { Button } from '@/components/ui/button'
import { useUniversity } from '@/lib/contexts/UniversityContext'
import { getQuizWithQuestions } from '@/lib/supabase/universityUtils'
import { QuizResultsTable, StudentAttemptDetail } from '@/components/university/quiz'
import type { QuizWithQuestions, QuizAttempt } from '@/lib/types/quiz'

interface PageProps {
  params: { classId: string; quizId: string }
}

export default function QuizResultsPage({ params }: PageProps) {
  const { classId, quizId } = params
  const router = useRouter()
  const { currentRole, currentUser } = useUniversity()
  
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null)

  const isInstructor = currentRole === 'instructor'

  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true)
        const quizData = await getQuizWithQuestions(quizId)
        setQuiz(quizData)
      } catch (err) {
        console.error('Error loading quiz:', err)
      } finally {
        setLoading(false)
      }
    }
    loadQuiz()
  }, [quizId])

  const handleBack = () => {
    if (selectedAttempt) {
      setSelectedAttempt(null)
    } else {
      router.push(`/university/${classId}/quizzes/${quizId}`)
    }
  }

  const handleViewAttempt = (attempt: QuizAttempt) => {
    setSelectedAttempt(attempt)
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

  if (!quiz) {
    return (
      <PageContainer>
        <GlassCard className="p-8 text-center">
          <p className="text-[var(--text-muted)]">Quiz not found</p>
          <Button variant="glass" className="mt-4" onClick={() => router.push(`/university/${classId}/quizzes`)}>
            Go Back
          </Button>
        </GlassCard>
      </PageContainer>
    )
  }

  // Non-instructors shouldn't access this page directly
  if (!isInstructor) {
    router.push(`/university/${classId}/quizzes/${quizId}`)
    return null
  }

  // View individual attempt
  if (selectedAttempt) {
    return (
      <PageContainer>
        <StudentAttemptDetail
          attemptId={selectedAttempt.id}
          instructorId={currentUser?.id || ''}
          onBack={handleBack}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quiz
          </Button>
          <h1 className="text-xl font-bold text-white">
            Results: {quiz.title}
          </h1>
        </div>

        {/* Results Table */}
        <QuizResultsTable
          quizId={quizId}
          passingScore={quiz.passing_score}
          onViewAttempt={handleViewAttempt}
        />
      </div>
    </PageContainer>
  )
}
