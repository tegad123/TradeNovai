"use client"

import { useState } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  Target,
  Timer
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/glass/GlassCard'
import { useQuizResults } from '@/lib/hooks/useUniversityQuizzes'
import type { QuizAttempt, QuizStats } from '@/lib/types/quiz'

interface QuizResultsTableProps {
  quizId: string
  passingScore: number
  onViewAttempt?: (attempt: QuizAttempt) => void
}

export function QuizResultsTable({ quizId, passingScore, onViewAttempt }: QuizResultsTableProps) {
  const { attempts, stats, loading, error, refresh } = useQuizResults({ 
    quizId, 
    role: 'instructor' 
  })
  const [sortField, setSortField] = useState<'submitted_at' | 'score_percentage' | 'student_name'>('submitted_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedAttempts = [...attempts].sort((a, b) => {
    let aVal: string | number | null
    let bVal: string | number | null

    switch (sortField) {
      case 'submitted_at':
        aVal = a.submitted_at || ''
        bVal = b.submitted_at || ''
        break
      case 'score_percentage':
        aVal = a.score_percentage || 0
        bVal = b.score_percentage || 0
        break
      case 'student_name':
        aVal = a.student_name || ''
        bVal = b.student_name || ''
        break
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (attempt: QuizAttempt) => {
    switch (attempt.status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
            <Clock className="w-3 h-3" />
            In Progress
          </span>
        )
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
            <AlertCircle className="w-3 h-3" />
            Needs Grading
          </span>
        )
      case 'graded':
        const passed = (attempt.score_percentage || 0) >= passingScore
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
            passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {passed ? 'Passed' : 'Failed'}
          </span>
        )
      case 'timed_out':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
            <Clock className="w-3 h-3" />
            Timed Out
          </span>
        )
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />
  }

  if (loading) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[hsl(var(--theme-primary))] border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-[var(--text-muted)]">Loading results...</p>
      </GlassCard>
    )
  }

  if (error) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-red-400">{error}</p>
        <Button variant="glass" className="mt-4" onClick={refresh}>
          Try Again
        </Button>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
              <Users className="w-4 h-4" />
              Attempts
            </div>
            <p className="text-2xl font-bold text-white">{stats.total_attempts}</p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Average
            </div>
            <p className="text-2xl font-bold text-white">{stats.average_score}%</p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Highest
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.highest_score}%</p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
              <XCircle className="w-4 h-4 text-red-400" />
              Lowest
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.lowest_score}%</p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
              <Target className="w-4 h-4" />
              Pass Rate
            </div>
            <p className="text-2xl font-bold text-white">{stats.pass_rate}%</p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm mb-1">
              <Timer className="w-4 h-4" />
              Avg Time
            </div>
            <p className="text-2xl font-bold text-white">{formatTime(stats.average_time_seconds)}</p>
          </GlassCard>
        </div>
      )}

      {/* Results Table */}
      <GlassCard className="overflow-hidden">
        {attempts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text-muted)]">No attempts yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th 
                    className="text-left p-4 text-sm font-medium text-[var(--text-muted)] cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('student_name')}
                  >
                    <div className="flex items-center gap-1">
                      Student
                      <SortIcon field="student_name" />
                    </div>
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--text-muted)]">
                    Attempt
                  </th>
                  <th 
                    className="text-left p-4 text-sm font-medium text-[var(--text-muted)] cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('score_percentage')}
                  >
                    <div className="flex items-center gap-1">
                      Score
                      <SortIcon field="score_percentage" />
                    </div>
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--text-muted)]">
                    Time
                  </th>
                  <th 
                    className="text-left p-4 text-sm font-medium text-[var(--text-muted)] cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('submitted_at')}
                  >
                    <div className="flex items-center gap-1">
                      Submitted
                      <SortIcon field="submitted_at" />
                    </div>
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--text-muted)]">
                    Status
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-[var(--text-muted)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAttempts.map((attempt) => (
                  <tr 
                    key={attempt.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <span className="text-white font-medium">
                        {attempt.student_name || 'Student'}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">
                      #{attempt.attempt_number}
                    </td>
                    <td className="p-4">
                      {attempt.score_percentage !== null ? (
                        <span className={`font-semibold ${
                          attempt.score_percentage >= passingScore 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {attempt.score_percentage}%
                          <span className="text-[var(--text-muted)] font-normal text-sm ml-1">
                            ({attempt.score} pts)
                          </span>
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">
                      {formatTime(attempt.time_spent_seconds)}
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">
                      {formatDate(attempt.submitted_at)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(attempt)}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewAttempt?.(attempt)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
