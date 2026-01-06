"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuthContext } from '@/lib/contexts/SupabaseAuthContext'
import {
  getUserCourses,
  getCourseById,
  joinCourse as joinCourseUtil,
  createCourse as createCourseUtil,
  getUserRoleInCourse,
  getOrCreateProfile,
  type Course
} from '@/lib/supabase/universityUtils'

export function useUniversityCourses() {
  const { user } = useSupabaseAuthContext()
  const [courses, setCourses] = useState<Course[]>([])
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null)
  const [currentRole, setCurrentRole] = useState<'student' | 'instructor' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load courses on mount
  useEffect(() => {
    async function loadCourses() {
      if (!user) {
        setCourses([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        // Ensure user profile exists
        await getOrCreateProfile(
          user.id,
          user.user_metadata?.full_name,
          user.user_metadata?.avatar_url
        )
        
        const userCourses = await getUserCourses(user.id)
        setCourses(userCourses)
      } catch (err) {
        console.error('Error loading courses:', err)
        setError('Failed to load courses')
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [user])

  // Load role when current course changes
  useEffect(() => {
    async function loadRole() {
      if (!user || !currentCourse) {
        setCurrentRole(null)
        return
      }

      const role = await getUserRoleInCourse(user.id, currentCourse.id)
      setCurrentRole(role)
    }

    loadRole()
  }, [user, currentCourse])

  const selectCourse = useCallback(async (courseId: string) => {
    const course = await getCourseById(courseId)
    setCurrentCourse(course)
  }, [])

  const joinCourse = useCallback(async (accessCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const result = await joinCourseUtil(user.id, accessCode)
    
    if (result.success && result.course) {
      // Refresh courses list
      const userCourses = await getUserCourses(user.id)
      setCourses(userCourses)
      setCurrentCourse(result.course)
      return { success: true }
    }

    return { success: false, error: result.error }
  }, [user])

  const createCourse = useCallback(async (data: {
    name: string
    code: string
    access_code?: string
    description?: string
  }): Promise<Course | null> => {
    if (!user) return null

    const course = await createCourseUtil(user.id, {
      ...data,
      access_code: data.access_code ?? data.code,
    })
    
    if (course) {
      // Refresh courses list
      const userCourses = await getUserCourses(user.id)
      setCourses(userCourses)
      setCurrentCourse(course)
    }

    return course
  }, [user])

  const refreshCourses = useCallback(async () => {
    if (!user) return

    const userCourses = await getUserCourses(user.id)
    setCourses(userCourses)
  }, [user])

  return {
    courses,
    currentCourse,
    currentRole,
    loading,
    error,
    selectCourse,
    setCurrentCourse,
    joinCourse,
    createCourse,
    refreshCourses
  }
}

