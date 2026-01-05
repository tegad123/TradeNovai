"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuthContext } from '@/lib/contexts/SupabaseAuthContext'
import {
  getStudentTradeLogs,
  getTradeLogsByCourse,
  submitTradeLog as submitTradeLogUtil,
  addFeedbackToTradeLog as addFeedbackUtil,
  type UniversityTradeLog
} from '@/lib/supabase/universityUtils'

export function useUniversityTradeLogs(
  courseId: string | null, 
  role: 'student' | 'instructor' | null
) {
  const { user } = useSupabaseAuthContext()
  const [tradeLogs, setTradeLogs] = useState<UniversityTradeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load trade logs
  const loadTradeLogs = useCallback(async () => {
    if (!courseId || !user) {
      setTradeLogs([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      let data: UniversityTradeLog[]
      if (role === 'instructor') {
        // Instructors see all course trade logs
        data = await getTradeLogsByCourse(courseId)
      } else {
        // Students see only their own
        data = await getStudentTradeLogs(user.id, courseId)
      }
      
      setTradeLogs(data)
    } catch (err) {
      console.error('Error loading trade logs:', err)
      setError('Failed to load trade logs')
    } finally {
      setLoading(false)
    }
  }, [courseId, user, role])

  useEffect(() => {
    loadTradeLogs()
  }, [loadTradeLogs])

  // Submit a trade log (student only)
  const submitTradeLog = useCallback(async (data: {
    trade_date: string
    symbol: string
    side: 'long' | 'short'
    entry_price: number
    exit_price: number
    pnl: number
    reflection: string
    screenshots?: string[]
  }): Promise<UniversityTradeLog | null> => {
    if (!user || !courseId) return null

    const log = await submitTradeLogUtil(courseId, user.id, data)
    
    if (log) {
      await loadTradeLogs()
    }

    return log
  }, [user, courseId, loadTradeLogs])

  // Add feedback to a trade log (instructor only)
  const addFeedback = useCallback(async (
    tradeLogId: string,
    feedback: string
  ): Promise<boolean> => {
    const success = await addFeedbackUtil(tradeLogId, feedback)
    
    if (success) {
      // Update local state
      setTradeLogs(prev => prev.map(log => 
        log.id === tradeLogId 
          ? { ...log, instructor_feedback: feedback, feedback_at: new Date().toISOString() }
          : log
      ))
    }

    return success
  }, [])

  // Stats for display
  const stats = {
    total: tradeLogs.length,
    withFeedback: tradeLogs.filter(l => l.instructor_feedback).length,
    pendingFeedback: tradeLogs.filter(l => !l.instructor_feedback).length,
    totalPnl: tradeLogs.reduce((acc, l) => acc + l.pnl, 0),
    winningTrades: tradeLogs.filter(l => l.pnl > 0).length,
    losingTrades: tradeLogs.filter(l => l.pnl < 0).length
  }

  return {
    tradeLogs,
    loading,
    error,
    stats,
    submitTradeLog,
    addFeedback,
    refresh: loadTradeLogs
  }
}

