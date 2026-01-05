"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuthContext } from '@/lib/contexts/SupabaseAuthContext'
import {
  getStudentProgress,
  getCourseProgress,
  type StudentProgress
} from '@/lib/supabase/universityUtils'

export function useUniversityProgress(
  courseId: string | null,
  role: 'student' | 'instructor' | null
) {
  const { user } = useSupabaseAuthContext()
  const [progress, setProgress] = useState<StudentProgress | null>(null)
  const [allStudentsProgress, setAllStudentsProgress] = useState<StudentProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load progress data
  const loadProgress = useCallback(async () => {
    if (!courseId || !user) {
      setProgress(null)
      setAllStudentsProgress([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      if (role === 'instructor') {
        // Instructor sees all students' progress
        const data = await getCourseProgress(courseId)
        setAllStudentsProgress(data)
        setProgress(null)
      } else {
        // Student sees their own progress
        const data = await getStudentProgress(user.id, courseId)
        setProgress(data)
        setAllStudentsProgress([])
      }
      
    } catch (err) {
      console.error('Error loading progress:', err)
      setError('Failed to load progress')
    } finally {
      setLoading(false)
    }
  }, [courseId, user, role])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  // Computed stats for student
  const studentStats = progress ? {
    courseCompletion: progress.total_lessons > 0
      ? Math.round((progress.lessons_completed / progress.total_lessons) * 100)
      : 0,
    assignmentCompletion: progress.total_assignments > 0
      ? Math.round((progress.assignments_completed / progress.total_assignments) * 100)
      : 0,
    averageGrade: progress.average_grade,
    tradeLogsSubmitted: progress.trade_logs_submitted
  } : null

  // Computed stats for instructor (class overview)
  const classStats = allStudentsProgress.length > 0 ? {
    totalStudents: allStudentsProgress.length,
    averageCourseCompletion: Math.round(
      allStudentsProgress.reduce((acc, s) => 
        acc + (s.total_lessons > 0 
          ? (s.lessons_completed / s.total_lessons) * 100 
          : 0), 0
      ) / allStudentsProgress.length
    ),
    averageGrade: Math.round(
      allStudentsProgress.reduce((acc, s) => acc + s.average_grade, 0) 
      / allStudentsProgress.length
    ),
    totalTradeLogsSubmitted: allStudentsProgress.reduce(
      (acc, s) => acc + s.trade_logs_submitted, 0
    ),
    studentsWithPerfectProgress: allStudentsProgress.filter(s => 
      s.lessons_completed === s.total_lessons && s.total_lessons > 0
    ).length
  } : null

  return {
    progress,
    allStudentsProgress,
    loading,
    error,
    studentStats,
    classStats,
    refresh: loadProgress
  }
}

