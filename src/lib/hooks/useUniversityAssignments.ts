"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuthContext } from '@/lib/contexts/SupabaseAuthContext'
import {
  getAssignmentsByCourse,
  getStudentSubmissions,
  getCourseSubmissions,
  getStudentVisibleAssignments,
  createAssignment as createAssignmentUtil,
  submitAssignmentWithFile,
  gradeSubmission as gradeSubmissionUtil,
  type Assignment,
  type Submission
} from '@/lib/supabase/universityUtils'

export function useUniversityAssignments(
  courseId: string | null,
  role: 'student' | 'instructor' | null
) {
  const { user } = useSupabaseAuthContext()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load assignments and submissions
  const loadData = useCallback(async () => {
    if (!courseId || !user) {
      setAssignments([])
      setSubmissions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Load assignments based on role
      let assignmentData: Assignment[]
      if (role === 'instructor') {
        // Instructors see all assignments
        assignmentData = await getAssignmentsByCourse(courseId)
      } else {
        // Students only see non-restricted or assigned assignments
        assignmentData = await getStudentVisibleAssignments(courseId, user.id)
      }
      setAssignments(assignmentData)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useUniversityAssignments.ts:loadData:assignments',message:'loaded assignments',data:{courseIdTail:courseId.slice(-6),userIdTail:user.id.slice(-6),role,assignmentsCount:assignmentData.length,publishedCount:assignmentData.filter(a=>a.is_published).length,restrictedCount:assignmentData.filter(a=>a.is_restricted).length},timestamp:Date.now(),sessionId:'debug-session',runId:'module-assign-v1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      // Load submissions based on role
      let submissionData: Submission[]
      if (role === 'instructor') {
        submissionData = await getCourseSubmissions(courseId)
      } else {
        submissionData = await getStudentSubmissions(user.id, courseId)
      }
      setSubmissions(submissionData)
      
    } catch (err) {
      console.error('Error loading assignments:', err)
      setError('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [courseId, user, role])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Create assignment (instructor only)
  const createAssignment = useCallback(async (data: {
    title: string
    description?: string
    due_date?: string
    points?: number
    type?: 'reflection' | 'trade_analysis' | 'quiz' | 'journal'
    attachments?: string[]
    is_restricted?: boolean
  }): Promise<Assignment | null> => {
    if (!courseId) return null

    const assignment = await createAssignmentUtil(courseId, data)
    
    if (assignment) {
      await loadData()
    }

    return assignment
  }, [courseId, loadData])

  // Submit assignment (student only)
  const submitAssignment = useCallback(async (
    assignmentId: string,
    content: string,
    fileUrl?: string
  ): Promise<boolean> => {
    if (!user) return false

    const submission = await submitAssignmentWithFile(assignmentId, user.id, content, fileUrl)
    
    if (submission) {
      await loadData()
      return true
    }

    return false
  }, [user, loadData])

  // Grade submission (instructor only)
  const gradeSubmission = useCallback(async (
    submissionId: string,
    grade: number,
    feedback: string
  ): Promise<boolean> => {
    const success = await gradeSubmissionUtil(submissionId, grade, feedback)
    
    if (success) {
      // Update local state
      setSubmissions(prev => prev.map(s => 
        s.id === submissionId 
          ? { ...s, grade, feedback, graded_at: new Date().toISOString(), status: 'graded' as const }
          : s
      ))
    }

    return success
  }, [])

  // Get submission for a specific assignment (student view)
  const getSubmissionForAssignment = useCallback((assignmentId: string): Submission | null => {
    return submissions.find(s => s.assignment_id === assignmentId) || null
  }, [submissions])

  // Get submissions for a specific assignment (instructor view)
  const getSubmissionsForAssignment = useCallback((assignmentId: string): Submission[] => {
    return submissions.filter(s => s.assignment_id === assignmentId)
  }, [submissions])

  // Stats
  const stats = {
    totalAssignments: assignments.length,
    publishedAssignments: assignments.filter(a => a.is_published).length,
    pendingSubmissions: submissions.filter(s => s.status === 'submitted').length,
    gradedSubmissions: submissions.filter(s => s.status === 'graded').length,
    upcomingAssignments: assignments.filter(a => 
      a.due_date && new Date(a.due_date) > new Date()
    ).length
  }

  return {
    assignments,
    submissions,
    loading,
    error,
    stats,
    createAssignment,
    submitAssignment,
    gradeSubmission,
    getSubmissionForAssignment,
    getSubmissionsForAssignment,
    refresh: loadData,
    refetch: loadData
  }
}

