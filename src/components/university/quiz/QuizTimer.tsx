"use client"

import { Clock, AlertTriangle } from 'lucide-react'
import type { QuizTimerState } from '@/lib/types/quiz'

interface QuizTimerProps {
  timer: QuizTimerState
  className?: string
}

export function QuizTimer({ timer, className = '' }: QuizTimerProps) {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isLowTime = timer.remaining_seconds < 60 // Less than 1 minute
  const isCriticalTime = timer.remaining_seconds < 30 // Less than 30 seconds

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isCriticalTime ? (
        <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
      ) : (
        <Clock className={`w-5 h-5 ${isLowTime ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`} />
      )}
      <span
        className={`font-mono text-lg font-bold ${
          isCriticalTime
            ? 'text-red-400 animate-pulse'
            : isLowTime
            ? 'text-yellow-400'
            : 'text-white'
        }`}
      >
        {formatTime(timer.remaining_seconds)}
      </span>
      {timer.is_expired && (
        <span className="text-sm text-red-400">Time&apos;s up!</span>
      )}
    </div>
  )
}
