"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuthContext } from '@/lib/contexts/SupabaseAuthContext'
import {
  getModulesWithProgress,
  createModule as createModuleUtil,
  updateModule as updateModuleUtil,
  createLesson as createLessonUtil,
  updateLesson as updateLessonUtil,
  markLessonComplete as markLessonCompleteUtil,
  removeLessonVideo as removeLessonVideoUtil,
  getModuleAssignments,
  assignModuleToStudent,
  unassignModuleFromStudent,
  type Module,
  type Lesson
} from '@/lib/supabase/universityUtils'

export function useUniversityModules(courseId: string | null) {
  const { user } = useSupabaseAuthContext()
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load modules with progress
  const loadModules = useCallback(async () => {
    if (!courseId || !user) {
      setModules([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getModulesWithProgress(courseId, user.id)
      setModules(data)
    } catch (err) {
      console.error('Error loading modules:', err)
      setError('Failed to load modules')
    } finally {
      setLoading(false)
    }
  }, [courseId, user])

  useEffect(() => {
    loadModules()
  }, [loadModules])

  // Calculate progress stats
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)
  const completedLessons = modules.reduce(
    (acc, m) => acc + (m.lessons?.filter(l => l.is_completed).length || 0),
    0
  )
  const progressPercent = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0

  // Mark lesson complete
  const markLessonComplete = useCallback(async (
    lessonId: string, 
    completed: boolean = true
  ): Promise<boolean> => {
    // #region agent log
    console.log('[DEBUG] Hook markLessonComplete called', {lessonId,completed,hasUser:!!user,userId:user?.id});
    // #endregion
    if (!user) return false

    const success = await markLessonCompleteUtil(user.id, lessonId, completed)
    // #region agent log
    console.log('[DEBUG] Hook markLessonCompleteUtil returned', {success,lessonId,completed});
    // #endregion
    
    if (success) {
      // Update local state
      setModules(prev => prev.map(module => ({
        ...module,
        lessons: module.lessons?.map(lesson => 
          lesson.id === lessonId 
            ? { ...lesson, is_completed: completed }
            : lesson
        )
      })))
    }

    return success
  }, [user])

  // Create module (instructor only)
  const createModule = useCallback(async (data: {
    title: string
    description?: string
    order?: number
  }): Promise<Module | null> => {
    if (!courseId) return null

    const createdModule = await createModuleUtil(courseId, data)
    
    if (createdModule) {
      await loadModules()
    }

    return createdModule
  }, [courseId, loadModules])

  // Update module (instructor only)
  const updateModule = useCallback(async (
    moduleId: string,
    data: Partial<{ title: string; description: string; order: number; is_published: boolean; is_restricted: boolean }>
  ): Promise<boolean> => {
    const success = await updateModuleUtil(moduleId, data)
    
    if (success) {
      await loadModules()
    }

    return success
  }, [loadModules])

  // Create lesson (instructor only)
  const createLesson = useCallback(async (
    moduleId: string,
    data: { title: string; content?: string; video_url?: string; order?: number; duration_minutes?: number }
  ): Promise<Lesson | null> => {
    const lesson = await createLessonUtil(moduleId, data)
    
    if (lesson) {
      await loadModules()
    }

    return lesson
  }, [loadModules])

  // Update lesson (instructor only)
  const updateLesson = useCallback(async (
    lessonId: string,
    data: Partial<{ title: string; content: string; video_url: string; order: number; duration_minutes: number }>
  ): Promise<boolean> => {
    const success = await updateLessonUtil(lessonId, data)
    
    if (success) {
      await loadModules()
    }

    return success
  }, [loadModules])

  // Remove lesson video (instructor only)
  const removeLessonVideo = useCallback(async (lessonId: string): Promise<boolean> => {
    const success = await removeLessonVideoUtil(lessonId)
    if (success) {
      await loadModules()
    }
    return success
  }, [loadModules])

  // Module assignments (instructor only)
  const assignModule = useCallback(async (moduleId: string, userId: string): Promise<boolean> => {
    const success = await assignModuleToStudent(moduleId, userId)
    if (success) {
      await loadModules()
    }
    return success
  }, [loadModules])

  const unassignModule = useCallback(async (moduleId: string, userId: string): Promise<boolean> => {
    const success = await unassignModuleFromStudent(moduleId, userId)
    if (success) {
      await loadModules()
    }
    return success
  }, [loadModules])

  return {
    modules,
    loading,
    error,
    totalLessons,
    completedLessons,
    progressPercent,
    markLessonComplete,
    createModule,
    updateModule,
    createLesson,
    updateLesson,
    removeLessonVideo,
    assignModule,
    unassignModule,
    refresh: loadModules
  }
}

