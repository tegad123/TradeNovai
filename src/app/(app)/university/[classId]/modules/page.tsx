"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  PlayCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Upload,
  Plus,
  Loader2,
  Trash2,
  Users,
  Settings2,
  ArrowRight,
  Link2,
  ExternalLink,
  Lock,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUniversity } from "@/lib/contexts/UniversityContext"
import { useUniversityModules } from "@/lib/hooks/useUniversityModules"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { uploadLessonVideo } from "@/lib/supabase/storageUtils"
import { 
  getCourseStudents, 
  setModulePrerequisite,
  getModulesWithLockStatus,
  deleteModule as deleteModuleUtil,
  setModuleRequiredAssignments,
  getModuleRequiredAssignments,
  getModulesWithFullLockStatus,
  getAssignmentsByCourse,
  type Lesson, 
  type UserProfile,
  type Module,
  type Assignment
} from "@/lib/supabase/universityUtils"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Helper to detect video provider from URL
function getVideoProvider(url: string): 'youtube' | 'vimeo' | 'direct' | 'external' | null {
  if (!url) return null
  
  const lowerUrl = url.toLowerCase()
  
  // YouTube patterns
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube'
  }
  
  // Vimeo patterns
  if (lowerUrl.includes('vimeo.com')) {
    return 'vimeo'
  }
  
  // Direct video file (mp4, webm, etc.) or Supabase storage URLs
  if (lowerUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) || lowerUrl.includes('supabase.co/storage')) {
    return 'direct'
  }
  
  // Any other URL - treat as external link (Whop, etc.)
  return 'external'
}

// Extract video ID and return embed URL
function getEmbedUrl(url: string): string | null {
  if (!url) return null
  
  const provider = getVideoProvider(url)
  
  if (provider === 'youtube') {
    // Handle various YouTube URL formats
    // youtube.com/watch?v=VIDEO_ID
    // youtu.be/VIDEO_ID
    // youtube.com/embed/VIDEO_ID
    let videoId = ''
    
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split(/[?&]/)[0] || ''
    } else if (url.includes('youtube.com/watch')) {
      const urlParams = new URL(url).searchParams
      videoId = urlParams.get('v') || ''
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('youtube.com/embed/')[1]?.split(/[?&]/)[0] || ''
    }
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`
    }
  }
  
  if (provider === 'vimeo') {
    // Handle Vimeo URL formats
    // vimeo.com/VIDEO_ID
    // player.vimeo.com/video/VIDEO_ID
    let videoId = ''
    
    if (url.includes('player.vimeo.com/video/')) {
      videoId = url.split('player.vimeo.com/video/')[1]?.split(/[?&]/)[0] || ''
    } else if (url.includes('vimeo.com/')) {
      videoId = url.split('vimeo.com/')[1]?.split(/[?&]/)[0] || ''
    }
    
    if (videoId) {
      return `https://player.vimeo.com/video/${videoId}`
    }
  }
  
  // For direct videos, return as-is
  if (provider === 'direct') {
    return url
  }
  
  return null
}

export default function ModulesPage() {
  const params = useParams()
  const classId = params.classId as string
  const { currentCourse, currentRole, currentUser } = useUniversity()
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [removingVideo, setRemovingVideo] = useState(false)
  const [markingComplete, setMarkingComplete] = useState<string | null>(null)
  const [videoSourceType, setVideoSourceType] = useState<'upload' | 'link'>('upload')
  const [videoLinkInput, setVideoLinkInput] = useState("")
  const [savingLink, setSavingLink] = useState(false)
  const [createModuleOpen, setCreateModuleOpen] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [newModuleDescription, setNewModuleDescription] = useState("")
  const [creatingModule, setCreatingModule] = useState(false)
  const [createLessonOpen, setCreateLessonOpen] = useState(false)
  const [createLessonModuleId, setCreateLessonModuleId] = useState<string | null>(null)
  const [newLessonTitle, setNewLessonTitle] = useState("")
  const [creatingLesson, setCreatingLesson] = useState(false)
  const [manageAccessOpen, setManageAccessOpen] = useState(false)
  const [accessModuleId, setAccessModuleId] = useState<string | null>(null)
  const [courseStudents, setCourseStudents] = useState<UserProfile[]>([])
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([])
  const [updatingAccess, setUpdatingAccess] = useState(false)
  const [videoCompleted, setVideoCompleted] = useState(false)
  
  // Post-create publish dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null)
  const [publishStep, setPublishStep] = useState<'choose' | 'select-students'>('choose')
  const [publishingModule, setPublishingModule] = useState(false)
  
  // Module prerequisites state
  const [moduleLockStatus, setModuleLockStatus] = useState<Record<string, { 
    isLocked: boolean
    blockedByModule: boolean
    blockedByAssignments: boolean
    prerequisiteModuleId: string | null
    prerequisiteModuleTitle: string | null
    requiredAssignmentIds: string[]
    incompleteAssignmentIds: string[]
  }>>({})
  const [selectedPrerequisiteModuleId, setSelectedPrerequisiteModuleId] = useState<string | null>(null)
  const [savingPrerequisite, setSavingPrerequisite] = useState(false)
  
  // Required assignments state
  const [courseAssignments, setCourseAssignments] = useState<Assignment[]>([])
  const [selectedRequiredAssignments, setSelectedRequiredAssignments] = useState<string[]>([])
  const [savingRequiredAssignments, setSavingRequiredAssignments] = useState(false)
  
  // Delete module state
  const [deleteModuleOpen, setDeleteModuleOpen] = useState(false)
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null)
  const [deletingModule, setDeletingModule] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const {
    modules,
    loading,
    totalLessons,
    completedLessons,
    progressPercent,
    markLessonComplete,
    updateLesson,
    createModule,
    updateModule,
    createLesson,
    removeLessonVideo,
    assignModule,
    unassignModule,
    refresh: refreshModules
  } = useUniversityModules(currentCourse?.id || null)

  const isInstructor = currentRole === 'instructor'

  // Compute next lesson
  const getNextLesson = useCallback(() => {
    if (!selectedLesson) return null
    
    // Flatten all lessons across modules
    const allLessons: { lesson: Lesson; moduleIndex: number }[] = []
    modules.forEach((mod, moduleIndex) => {
      mod.lessons?.forEach(lesson => {
        allLessons.push({ lesson, moduleIndex })
      })
    })
    
    const currentIndex = allLessons.findIndex(l => l.lesson.id === selectedLesson.id)
    if (currentIndex === -1 || currentIndex === allLessons.length - 1) return null
    
    return allLessons[currentIndex + 1].lesson
  }, [selectedLesson, modules])

  const nextLesson = getNextLesson()

  // Persist video position to localStorage
  const saveVideoPosition = useCallback(() => {
    if (videoRef.current && selectedLesson) {
      const currentTime = videoRef.current.currentTime
      if (currentTime > 0) {
        localStorage.setItem(`video-position-${selectedLesson.id}`, String(currentTime))
      }
    }
  }, [selectedLesson])

  // Restore video position from localStorage
  const restoreVideoPosition = useCallback(() => {
    if (videoRef.current && selectedLesson) {
      const savedTime = localStorage.getItem(`video-position-${selectedLesson.id}`)
      if (savedTime) {
        videoRef.current.currentTime = parseFloat(savedTime)
      }
    }
  }, [selectedLesson])

  // Handle video ended - auto-complete lesson
  const handleVideoEnded = useCallback(async () => {
    if (selectedLesson && !selectedLesson.is_completed) {
      setVideoCompleted(true)
      // Clear saved position since video is complete
      localStorage.removeItem(`video-position-${selectedLesson.id}`)
      // Auto-mark as complete
      await markLessonComplete(selectedLesson.id, true)
      setSelectedLesson(prev => prev ? { ...prev, is_completed: true } : null)
    }
  }, [selectedLesson, markLessonComplete])

  // Update video position periodically
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => saveVideoPosition()
    const handleLoadedData = () => restoreVideoPosition()
    
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadeddata', handleLoadedData)
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadeddata', handleLoadedData)
    }
  }, [saveVideoPosition, restoreVideoPosition])

  // Reset video completed state when lesson changes
  useEffect(() => {
    setVideoCompleted(false)
  }, [selectedLesson?.id])

  // Load module lock status for students
  useEffect(() => {
    async function loadLockStatus() {
      if (!currentCourse?.id || !currentUser?.id || isInstructor) return
      
      const lockData = await getModulesWithFullLockStatus(currentCourse.id, currentUser.id)
      const lockMap: Record<string, { 
        isLocked: boolean
        blockedByModule: boolean
        blockedByAssignments: boolean
        prerequisiteModuleId: string | null
        prerequisiteModuleTitle: string | null
        requiredAssignmentIds: string[]
        incompleteAssignmentIds: string[]
      }> = {}
      
      lockData.forEach((item, moduleId) => {
        const prereqMod = modules.find(m => m.id === item.prerequisiteModuleId)
        lockMap[moduleId] = {
          isLocked: item.isLocked,
          blockedByModule: item.blockedByModule,
          blockedByAssignments: item.blockedByAssignments,
          prerequisiteModuleId: item.prerequisiteModuleId,
          prerequisiteModuleTitle: prereqMod?.title || null,
          requiredAssignmentIds: item.requiredAssignmentIds,
          incompleteAssignmentIds: item.incompleteAssignmentIds
        }
      })
      setModuleLockStatus(lockMap)
    }
    
    loadLockStatus()
  }, [currentCourse?.id, currentUser?.id, isInstructor, modules])

  // Set selected prerequisite and load required assignments when opening manage access dialog
  useEffect(() => {
    if (accessModuleId && manageAccessOpen) {
      const mod = modules.find(m => m.id === accessModuleId)
      setSelectedPrerequisiteModuleId(mod?.prerequisite_module_id || null)
      
      // Load course assignments and module's required assignments
      const loadAssignmentsData = async () => {
        if (!currentCourse?.id) return
        
        // Load all assignments for the course
        const assignments = await getAssignmentsByCourse(currentCourse.id)
        setCourseAssignments(assignments)
        
        // Load required assignments for this module
        const requiredIds = await getModuleRequiredAssignments(accessModuleId)
        setSelectedRequiredAssignments(requiredIds)
      }
      
      loadAssignmentsData()
    }
  }, [accessModuleId, manageAccessOpen, modules, currentCourse?.id])

  const goToNextLesson = () => {
    if (nextLesson) {
      setSelectedLesson(nextLesson)
      // Expand the module containing the next lesson if not already
      const moduleWithNextLesson = modules.find(m => m.lessons?.some(l => l.id === nextLesson.id))
      if (moduleWithNextLesson && !expandedModules.includes(moduleWithNextLesson.id)) {
        setExpandedModules(prev => [...prev, moduleWithNextLesson.id])
      }
    }
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const handleMarkComplete = async (lessonId: string, currentlyCompleted: boolean) => {
    setMarkingComplete(lessonId)
    await markLessonComplete(lessonId, !currentlyCompleted)
    
    // Update selected lesson if it's the same one
    if (selectedLesson?.id === lessonId) {
      setSelectedLesson(prev => prev ? { ...prev, is_completed: !currentlyCompleted } : null)
    }
    
    setMarkingComplete(null)
  }

  const handleRemoveVideo = async () => {
    if (!selectedLesson) return
    if (!confirm("Are you sure you want to remove this video?")) return

    setRemovingVideo(true)
    try {
      const success = await removeLessonVideo(selectedLesson.id)
      if (success) {
        setSelectedLesson(prev => prev ? { ...prev, video_url: null } : null)
      } else {
        alert("Failed to remove video")
      }
    } catch (error) {
      console.error('Remove video error:', error)
      alert("Failed to remove video")
    } finally {
      setRemovingVideo(false)
    }
  }

  const handleOpenAccess = async (moduleId: string) => {
    setAccessModuleId(moduleId)
    setManageAccessOpen(true)
    
    // Fetch students and current assignments
    if (currentCourse?.id) {
      const realStudents = await getCourseStudents(currentCourse.id)
      setCourseStudents(realStudents)
      
      const { getModuleAssignments: getAssignments } = await import("@/lib/supabase/universityUtils")
      const assignments = await getAssignments(moduleId)
      setAssignedStudentIds(assignments)
    }
  }

  const handleToggleAssignment = async (studentId: string) => {
    if (!accessModuleId || !currentCourse) return
    
    const isAssigned = assignedStudentIds.includes(studentId)
    setUpdatingAccess(true)
    
    try {
      if (isAssigned) {
        const success = await unassignModule(accessModuleId, studentId)
        if (success) {
          setAssignedStudentIds(prev => prev.filter(id => id !== studentId))
        }
      } else {
        const success = await assignModule(accessModuleId, studentId)
        if (success) {
          setAssignedStudentIds(prev => [...prev, studentId])
        }
      }
    } catch (error) {
      console.error('Toggle assignment error:', error)
    } finally {
      setUpdatingAccess(false)
    }
  }

  const handleToggleRestricted = async (restricted: boolean) => {
    if (!accessModuleId) return
    await updateModule(accessModuleId, { is_restricted: restricted } as any)
  }

  const handleTogglePublished = async (published: boolean) => {
    if (!accessModuleId) return
    const ok = await updateModule(accessModuleId, { is_published: published } as any)
  }

  const handleSavePrerequisite = async () => {
    if (!accessModuleId) return
    
    setSavingPrerequisite(true)
    try {
      const success = await setModulePrerequisite(accessModuleId, selectedPrerequisiteModuleId)
      if (success) {
        // Refresh module data by triggering a re-render
        await updateModule(accessModuleId, { prerequisite_module_id: selectedPrerequisiteModuleId } as any)
      }
    } catch (error) {
      console.error('Save prerequisite error:', error)
    } finally {
      setSavingPrerequisite(false)
    }
  }

  const handleSaveRequiredAssignments = async () => {
    if (!accessModuleId) return
    
    setSavingRequiredAssignments(true)
    try {
      const success = await setModuleRequiredAssignments(accessModuleId, selectedRequiredAssignments)
      if (!success) {
        alert('Failed to save required assignments')
      }
    } catch (error) {
      console.error('Save required assignments error:', error)
    } finally {
      setSavingRequiredAssignments(false)
    }
  }

  const toggleRequiredAssignment = (assignmentId: string) => {
    setSelectedRequiredAssignments(prev => 
      prev.includes(assignmentId)
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    )
  }

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return
    
    setDeletingModule(true)
    try {
      const success = await deleteModuleUtil(moduleToDelete.id)
      if (success) {
        setDeleteModuleOpen(false)
        setModuleToDelete(null)
        // Clear selected lesson if it was in the deleted module
        if (selectedLesson && moduleToDelete.lessons?.some(l => l.id === selectedLesson.id)) {
          setSelectedLesson(null)
        }
        // Refresh the modules list
        await refreshModules()
      } else {
        alert('Failed to delete module')
      }
    } catch (error) {
      console.error('Delete module error:', error)
      alert('Failed to delete module')
    } finally {
      setDeletingModule(false)
    }
  }

  const openDeleteModuleDialog = (mod: Module) => {
    setModuleToDelete(mod)
    setDeleteModuleOpen(true)
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedLesson || !currentUser) return

    const file = e.target.files[0]
    setUploadingVideo(true)

    try {
      const result = await uploadLessonVideo(file, currentUser.id)
      
      if (result.success && result.url) {
        const url = result.url
        await updateLesson(selectedLesson.id, { video_url: url })
        setSelectedLesson(prev => prev ? { ...prev, video_url: url } : null)
      } else {
        alert(result.error || 'Failed to upload video')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload video')
    } finally {
      setUploadingVideo(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSaveVideoLink = async () => {
    if (!selectedLesson || !videoLinkInput.trim()) return

    const trimmedUrl = videoLinkInput.trim()
    
    // Validate the URL format
    try {
      new URL(trimmedUrl)
    } catch {
      alert('Please enter a valid URL')
      return
    }

    setSavingLink(true)

    try {
      await updateLesson(selectedLesson.id, { video_url: trimmedUrl })
      setSelectedLesson(prev => prev ? { ...prev, video_url: trimmedUrl } : null)
      setVideoLinkInput("")
    } catch (error) {
      console.error('Save link error:', error)
      alert('Failed to save video link')
    } finally {
      setSavingLink(false)
    }
  }

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim()) return
    if (!currentCourse?.id) return

    setCreatingModule(true)

    try {
      const result = await createModule({
        title: newModuleTitle.trim(),
        description: newModuleDescription.trim() || undefined,
        order: modules.length,
      })

      if (!result) {
        alert("Failed to create module. This is usually caused by missing Supabase tables (run 003_university_tables.sql) or RLS blocking inserts.")
        return
      }

      // Close create dialog and open publish dialog
      setCreateModuleOpen(false)
      setNewModuleTitle("")
      setNewModuleDescription("")
      
      // Open publish dialog for the newly created module
      setPendingModuleId(result.id)
      setPublishStep('choose')
      setPublishDialogOpen(true)
      
      // Pre-fetch students for potential restricted access selection
      const students = await getCourseStudents(currentCourse.id)
      setCourseStudents(students)
      setAssignedStudentIds([])
    } catch (err) {
      alert(`Error creating module: ${String(err)}`)
    } finally {
      setCreatingModule(false)
    }
  }
  
  // Handle publish dialog actions
  const handlePublishToAll = async () => {
    if (!pendingModuleId) return
    setPublishingModule(true)
    
    try {
      await updateModule(pendingModuleId, { is_published: true, is_restricted: false } as any)
      setPublishDialogOpen(false)
      setPendingModuleId(null)
    } catch (err) {
      alert(`Error publishing module: ${String(err)}`)
    } finally {
      setPublishingModule(false)
    }
  }
  
  const handleRestrictAccess = () => {
    // Move to student selection step
    setPublishStep('select-students')
  }
  
  const handleFinishRestricted = async () => {
    if (!pendingModuleId) return
    setPublishingModule(true)
    
    try {
      // Set module as published + restricted
      await updateModule(pendingModuleId, { is_published: true, is_restricted: true } as any)
      
      // Assign selected students
      for (const studentId of assignedStudentIds) {
        await assignModule(pendingModuleId, studentId)
      }
      
      setPublishDialogOpen(false)
      setPendingModuleId(null)
      setAssignedStudentIds([])
    } catch (err) {
      alert(`Error setting restricted access: ${String(err)}`)
    } finally {
      setPublishingModule(false)
    }
  }
  
  const handleToggleStudentForNewModule = (studentId: string) => {
    setAssignedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const openCreateLesson = (moduleId: string) => {
    setCreateLessonModuleId(moduleId)
    setNewLessonTitle("")
    setCreateLessonOpen(true)
  }

  const handleCreateLesson = async () => {
    if (!createLessonModuleId) return
    if (!newLessonTitle.trim()) return

    const moduleItem = modules.find(m => m.id === createLessonModuleId)
    const lessonCount = moduleItem?.lessons?.length || 0

    setCreatingLesson(true)

    try {
      const lesson = await createLesson(createLessonModuleId, {
        title: newLessonTitle.trim(),
        order: lessonCount,
      })

      if (!lesson) {
        alert("Failed to create lesson. This is usually caused by missing Supabase tables (run 003_university_tables.sql) or RLS blocking inserts.")
        return
      }

      // Auto-select the newly created lesson so user can immediately add video
      setSelectedLesson(lesson)
      
      // Expand the module if not already
      if (!expandedModules.includes(createLessonModuleId)) {
        setExpandedModules(prev => [...prev, createLessonModuleId])
      }

      setCreateLessonOpen(false)
      setCreateLessonModuleId(null)
      setNewLessonTitle("")
    } catch (err) {
      alert(`Error creating lesson: ${String(err)}`)
    } finally {
      setCreatingLesson(false)
    }
  }

  if (!currentCourse) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Modules</h1>
            <p className="text-[var(--text-muted)]">
              {loading ? 'Loading...' : `${completedLessons} of ${totalLessons} lessons completed`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-theme-gradient"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm text-[var(--text-muted)]">
                {progressPercent}%
              </span>
            </div>
            {isInstructor && (
              <Button
                variant="glass-theme"
                onClick={() => setCreateModuleOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Module
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
            <div className="lg:col-span-2">
              <div className="h-96 rounded-xl bg-white/5 animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Module List */}
            <div className="lg:col-span-1 space-y-3">
              {modules.length > 0 ? modules.map((module) => {
                const isExpanded = expandedModules.includes(module.id)
                const completedCount = module.lessons?.filter(l => l.is_completed).length || 0
                const totalCount = module.lessons?.length || 0

                const lockStatus = moduleLockStatus[module.id]
                const isLocked = !isInstructor && lockStatus?.isLocked
                const prerequisiteTitle = lockStatus?.prerequisiteModuleTitle
                const blockedByModule = lockStatus?.blockedByModule
                const blockedByAssignments = lockStatus?.blockedByAssignments
                const incompleteCount = lockStatus?.incompleteAssignmentIds?.length || 0

                // Build lock message
                let lockMessage = ''
                if (isLocked) {
                  if (blockedByModule && prerequisiteTitle) {
                    lockMessage = `Complete "${prerequisiteTitle}" first`
                  }
                  if (blockedByAssignments) {
                    if (lockMessage) lockMessage += ' and '
                    lockMessage += `complete ${incompleteCount} assignment${incompleteCount !== 1 ? 's' : ''}`
                  }
                }

                return (
                  <GlassCard key={module.id} className={cn("overflow-hidden", isLocked && "opacity-60")}>
                    <button
                      onClick={() => !isLocked && toggleModule(module.id)}
                      className={cn(
                        "w-full p-4 flex items-center gap-3 transition-colors",
                        isLocked ? "cursor-not-allowed" : "hover:bg-white/5"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        isLocked ? "bg-yellow-500/20" : "bg-white/10"
                      )}>
                        {isLocked ? (
                          <Lock className="w-4 h-4 text-yellow-400" />
                        ) : isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-white" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{module.title}</h3>
                          {module.is_restricted && (
                            <Users className="w-3 h-3 text-[hsl(var(--theme-primary))]" />
                          )}
                          {isLocked && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                              Locked
                            </span>
                          )}
                        </div>
                        {isLocked ? (
                          <p className="text-xs text-yellow-400/70">
                            {lockMessage}
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--text-muted)]">
                            {completedCount}/{totalCount} lessons
                          </p>
                        )}
                      </div>
                      {isInstructor && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg hover:bg-white/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenAccess(module.id)
                            }}
                          >
                            <Settings2 className="w-4 h-4 text-[var(--text-muted)]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg hover:bg-red-500/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDeleteModuleDialog(module)
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </>
                      )}
                      {!isLocked && completedCount === totalCount && totalCount > 0 && (
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/10">
                        {module.lessons?.map((lesson) => (
                          <button
                            key={lesson.id}
                            onClick={() => setSelectedLesson(lesson)}
                            className={cn(
                              "w-full p-3 pl-14 flex items-center gap-3 hover:bg-white/5 transition-colors text-left",
                              selectedLesson?.id === lesson.id && "bg-white/10"
                            )}
                          >
                            {lesson.is_completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                            ) : (
                              <PlayCircle className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                            )}
                            <span className={cn(
                              "text-sm flex-1",
                              lesson.is_completed ? "text-[var(--text-muted)]" : "text-white"
                            )}>
                              {lesson.title}
                            </span>
                            {lesson.duration_minutes && (
                              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {lesson.duration_minutes}m
                              </span>
                            )}
                          </button>
                        ))}
                        {isInstructor && (
                          <button
                            onClick={() => openCreateLesson(module.id)}
                            className="w-full p-3 pl-14 flex items-center gap-3 hover:bg-white/5 transition-colors text-left text-[hsl(var(--theme-primary))]"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm">Add Lesson</span>
                          </button>
                        )}
                      </div>
                    )}
                  </GlassCard>
                )
              }) : (
                <GlassCard className="p-8 text-center">
                  <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-2" />
                  <p className="text-[var(--text-muted)]">No modules yet</p>
                  {isInstructor && (
                    <Button variant="glass-theme" className="mt-4" onClick={() => setCreateModuleOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Module
                    </Button>
                  )}
                </GlassCard>
              )}
            </div>

            {/* Lesson Viewer */}
            <div className="lg:col-span-2">
              <GlassCard className="p-6 min-h-[400px]">
                {selectedLesson ? (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-white">{selectedLesson.title}</h2>
                          {selectedLesson.is_completed && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span className="text-xs font-medium text-green-400">Completed</span>
                            </div>
                          )}
                        </div>
                        {selectedLesson.duration_minutes && (
                          <p className="text-sm text-[var(--text-muted)] flex items-center gap-1 mt-1">
                            <Clock className="w-4 h-4" />
                            {selectedLesson.duration_minutes} minutes
                          </p>
                        )}
                      </div>
                      {/* Only show Mark Complete button to instructors */}
                      {isInstructor && (
                        <button
                          onClick={() => handleMarkComplete(selectedLesson.id, selectedLesson.is_completed || false)}
                          disabled={markingComplete === selectedLesson.id}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                            selectedLesson.is_completed
                              ? "bg-green-500/20 text-green-400"
                              : "bg-theme-gradient text-white hover:opacity-90"
                          )}
                        >
                          {markingComplete === selectedLesson.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          {selectedLesson.is_completed ? "Completed" : "Mark Complete"}
                        </button>
                      )}
                    </div>

                    {/* Video player or placeholder */}
                    <div className="relative group aspect-video rounded-xl bg-black/50 flex items-center justify-center overflow-hidden">
                      {selectedLesson.video_url ? (
                        <>
                          {/* Show embedded iframe for YouTube/Vimeo, native player for direct videos, or external link button */}
                          {getVideoProvider(selectedLesson.video_url) === 'youtube' || getVideoProvider(selectedLesson.video_url) === 'vimeo' ? (
                            <div className="w-full h-full flex flex-col">
                              <iframe
                                src={getEmbedUrl(selectedLesson.video_url) || ''}
                                className="w-full flex-1"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={selectedLesson.title}
                              />
                              {/* Mark complete button for YouTube/Vimeo - we can't detect video end due to iframe security */}
                              {!isInstructor && (
                                <div className="p-4 bg-black/30 backdrop-blur-sm flex items-center justify-between">
                                  {selectedLesson.is_completed ? (
                                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Lesson completed
                                    </div>
                                  ) : (
                                    <p className="text-sm text-[var(--text-muted)]">
                                      Click the button when you&apos;ve finished watching
                                    </p>
                                  )}
                                  {!selectedLesson.is_completed && (
                                    <button
                                      onClick={async () => {
                                        const result = await markLessonComplete(selectedLesson.id)
                                        if (result) {
                                          setSelectedLesson(prev => prev ? { ...prev, is_completed: true } : null)
                                          setVideoCompleted(true)
                                        }
                                      }}
                                      className="px-4 py-2 rounded-lg bg-theme-gradient text-white text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      Mark as Complete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : getVideoProvider(selectedLesson.video_url) === 'external' ? (
                            /* External link (Whop, etc.) - show button to open in new tab */
                            <div className="flex flex-col items-center justify-center gap-4 p-8">
                              <div className="w-16 h-16 rounded-full bg-theme-gradient/20 flex items-center justify-center">
                                <ExternalLink className="w-8 h-8 text-[hsl(var(--theme-primary))]" />
                              </div>
                              <div className="text-center">
                                <h3 className="text-lg font-medium text-white mb-2">External Content</h3>
                                <p className="text-sm text-[var(--text-muted)] mb-4">
                                  This lesson content is hosted on an external platform
                                </p>
                              </div>
                              <button
                                onClick={async () => {
                                  // Mark lesson as complete when student clicks the external link
                                  if (!isInstructor && selectedLesson && !selectedLesson.is_completed) {
                                    await markLessonComplete(selectedLesson.id)
                                    setVideoCompleted(true)
                                  }
                                  // Open the link in a new tab
                                  if (selectedLesson.video_url) {
                                    window.open(selectedLesson.video_url, '_blank', 'noopener,noreferrer')
                                  }
                                }}
                                className="px-6 py-3 rounded-xl bg-theme-gradient text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                              >
                                <ExternalLink className="w-5 h-5" />
                                Open Lesson Content
                              </button>
                              {selectedLesson.is_completed && (
                                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Lesson completed
                                </div>
                              )}
                            </div>
                          ) : (
                            <video
                              ref={videoRef}
                              controls
                              className="w-full h-full"
                              src={selectedLesson.video_url}
                              onEnded={handleVideoEnded}
                            >
                              Your browser does not support the video tag.
                            </video>
                          )}
                          {/* Only show remove button to instructors */}
                          {isInstructor && (
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                              {getVideoProvider(selectedLesson.video_url) !== 'direct' && (
                                <a
                                  href={selectedLesson.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm flex items-center gap-1.5 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Open
                                </a>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleRemoveVideo}
                                disabled={removingVideo}
                                className="bg-red-500/80 hover:bg-red-500 backdrop-blur-sm"
                              >
                                {removingVideo ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                Remove
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center w-full max-w-md px-4">
                          {isInstructor ? (
                            <>
                              {/* Toggle between Upload and Link */}
                              <div className="flex justify-center mb-6">
                                <div className="flex rounded-xl bg-white/5 p-1">
                                  <button
                                    onClick={() => setVideoSourceType('upload')}
                                    className={cn(
                                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                      videoSourceType === 'upload'
                                        ? "bg-theme-gradient text-white shadow-lg"
                                        : "text-[var(--text-muted)] hover:text-white"
                                    )}
                                  >
                                    <Upload className="w-4 h-4" />
                                    Upload
                                  </button>
                                  <button
                                    onClick={() => setVideoSourceType('link')}
                                    className={cn(
                                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                      videoSourceType === 'link'
                                        ? "bg-theme-gradient text-white shadow-lg"
                                        : "text-[var(--text-muted)] hover:text-white"
                                    )}
                                  >
                                    <Link2 className="w-4 h-4" />
                                    Link
                                  </button>
                                </div>
                              </div>

                              {videoSourceType === 'upload' ? (
                                <>
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="video/*"
                                    onChange={handleVideoUpload}
                                    className="hidden"
                                  />
                                  <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingVideo}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/5 transition-colors w-full"
                                  >
                                    {uploadingVideo ? (
                                      <Loader2 className="w-12 h-12 text-[hsl(var(--theme-primary))] animate-spin" />
                                    ) : (
                                      <Upload className="w-12 h-12 text-white/30" />
                                    )}
                                    <span className="text-[var(--text-muted)]">
                                      {uploadingVideo ? 'Uploading...' : 'Click to upload video file'}
                                    </span>
                                  </button>
                                </>
                              ) : (
                                <div className="space-y-4">
                                  <Link2 className="w-12 h-12 text-white/30 mx-auto" />
                                  <p className="text-[var(--text-muted)] text-sm">
                                    Paste a YouTube, Vimeo, or direct video URL
                                  </p>
                                  <div className="flex gap-2">
                                    <input
                                      type="url"
                                      value={videoLinkInput}
                                      onChange={(e) => setVideoLinkInput(e.target.value)}
                                      placeholder="https://youtube.com/watch?v=..."
                                      className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                                    />
                                    <Button
                                      variant="glass-theme"
                                      onClick={handleSaveVideoLink}
                                      disabled={savingLink || !videoLinkInput.trim()}
                                    >
                                      {savingLink ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        'Save'
                                      )}
                                    </Button>
                                  </div>
                                  <p className="text-xs text-[var(--text-muted)]">
                                    Supported: YouTube, Vimeo, or direct .mp4/.webm links
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-16 h-16 text-white/30 mx-auto mb-2" />
                              <p className="text-[var(--text-muted)]">Video content coming soon</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Next Lesson button - shows after completion or if already completed */}
                    {(selectedLesson.is_completed || videoCompleted) && nextLesson && (
                      <div className="flex justify-end">
                        <Button
                          variant="glass-theme"
                          onClick={goToNextLesson}
                          className="group"
                        >
                          Next: {nextLesson.title}
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    )}

                    {/* Lesson content */}
                    <div className="prose prose-invert max-w-none">
                      <p className="text-[var(--text-secondary)] leading-relaxed">
                        {selectedLesson.content || 'No content available for this lesson.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <BookOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">Select a Lesson</h3>
                      <p className="text-[var(--text-muted)]">
                        Choose a lesson from the left to start learning
                      </p>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        )}
      </div>

      <Dialog open={createModuleOpen} onOpenChange={setCreateModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create module</DialogTitle>
            <DialogDescription>Add a new module to this course.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-[var(--text-muted)]">Title</label>
              <input
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="e.g. Foundations"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-[var(--text-muted)]">Description (optional)</label>
              <textarea
                value={newModuleDescription}
                onChange={(e) => setNewModuleDescription(e.target.value)}
                placeholder="What will students learn in this module?"
                rows={3}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="glass" onClick={() => setCreateModuleOpen(false)} disabled={creatingModule}>
              Cancel
            </Button>
            <Button
              variant="glass-theme"
              onClick={handleCreateModule}
              disabled={creatingModule || !newModuleTitle.trim()}
            >
              {creatingModule ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createLessonOpen} onOpenChange={setCreateLessonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create lesson</DialogTitle>
            <DialogDescription>Add a lesson to this module.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-1">
            <label className="text-sm text-[var(--text-muted)]">Title</label>
            <input
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              placeholder="e.g. Risk fundamentals"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
            />
          </div>

          <DialogFooter className="mt-6">
            <Button variant="glass" onClick={() => setCreateLessonOpen(false)} disabled={creatingLesson}>
              Cancel
            </Button>
            <Button
              variant="glass-theme"
              onClick={handleCreateLesson}
              disabled={creatingLesson || !newLessonTitle.trim()}
            >
              {creatingLesson ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageAccessOpen} onOpenChange={setManageAccessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Access</DialogTitle>
            <DialogDescription>
              Control which students can access this module.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white">Published</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Students only see published modules.
                </div>
              </div>
              <Switch
                checked={modules.find(m => m.id === accessModuleId)?.is_published || false}
                onCheckedChange={handleTogglePublished}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white">Restrict Access</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Only assigned students will see this module.
                </div>
              </div>
              <Switch
                checked={modules.find(m => m.id === accessModuleId)?.is_restricted || false}
                onCheckedChange={handleToggleRestricted}
              />
            </div>

            {/* Prerequisite Module Selector */}
            <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white">Prerequisite Module</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Students must complete this module first
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedPrerequisiteModuleId || "none"}
                  onValueChange={(value) => setSelectedPrerequisiteModuleId(value === "none" ? null : value)}
                >
                  <SelectTrigger className="flex-1 bg-white/5 border-white/10">
                    <SelectValue placeholder="No prerequisite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No prerequisite</SelectItem>
                    {modules
                      .filter(m => m.id !== accessModuleId) // Can't be its own prerequisite
                      .map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="glass-theme"
                  size="sm"
                  onClick={handleSavePrerequisite}
                  disabled={savingPrerequisite}
                >
                  {savingPrerequisite ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>

            {/* Required Assignments Selector */}
            <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white">Required Assignments</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Students must complete these assignments before accessing this module
                </div>
              </div>
              <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {courseAssignments.length > 0 ? (
                  courseAssignments.map(assignment => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn(
                          "w-4 h-4",
                          selectedRequiredAssignments.includes(assignment.id)
                            ? "text-[hsl(var(--theme-primary))]"
                            : "text-white/30"
                        )} />
                        <span className="text-sm text-white truncate max-w-[200px]">
                          {assignment.title}
                        </span>
                      </div>
                      <Switch
                        checked={selectedRequiredAssignments.includes(assignment.id)}
                        onCheckedChange={() => toggleRequiredAssignment(assignment.id)}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-muted)] text-center py-2">
                    No assignments in this course yet.
                  </p>
                )}
              </div>
              {courseAssignments.length > 0 && (
                <Button
                  variant="glass-theme"
                  size="sm"
                  className="w-full"
                  onClick={handleSaveRequiredAssignments}
                  disabled={savingRequiredAssignments}
                >
                  {savingRequiredAssignments ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Required Assignments'
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white px-1">Assign Students</h4>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {courseStudents.length > 0 ? (
                  courseStudents.map(student => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-theme-gradient flex items-center justify-center text-xs font-bold text-white uppercase">
                          {student.full_name?.charAt(0) || student.id.charAt(0)}
                        </div>
                        <span className="text-sm text-white font-medium">
                          {student.full_name || 'Student'}
                        </span>
                      </div>
                      <Switch
                        disabled={updatingAccess}
                        checked={assignedStudentIds.includes(student.id)}
                        onCheckedChange={() => handleToggleAssignment(student.id)}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">
                    No students enrolled yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="glass-theme" className="w-full" onClick={() => setManageAccessOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-create publish dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={(open) => {
        if (!open && !publishingModule) {
          setPublishDialogOpen(false)
          setPendingModuleId(null)
          setPublishStep('choose')
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {publishStep === 'choose' ? 'Publish Module' : 'Select Students'}
            </DialogTitle>
            <DialogDescription>
              {publishStep === 'choose' 
                ? 'Choose how students will access this module.'
                : 'Select which students can access this module.'}
            </DialogDescription>
          </DialogHeader>

          {publishStep === 'choose' ? (
            <div className="mt-4 space-y-3">
              <button
                onClick={handlePublishToAll}
                disabled={publishingModule}
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Publish to all students</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      All enrolled students will see this module
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={handleRestrictAccess}
                disabled={publishingModule}
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Restrict to specific students</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Only selected students will see this module
                    </div>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {courseStudents.length > 0 ? (
                  courseStudents.map(student => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-theme-gradient flex items-center justify-center text-xs font-bold text-white uppercase">
                          {student.full_name?.charAt(0) || student.id.charAt(0)}
                        </div>
                        <span className="text-sm text-white font-medium">
                          {student.full_name || 'Student'}
                        </span>
                      </div>
                      <Switch
                        checked={assignedStudentIds.includes(student.id)}
                        onCheckedChange={() => handleToggleStudentForNewModule(student.id)}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">
                    No students enrolled yet.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="glass" onClick={() => setPublishStep('choose')} disabled={publishingModule}>
                  Back
                </Button>
                <Button
                  variant="glass-theme"
                  onClick={handleFinishRestricted}
                  disabled={publishingModule || assignedStudentIds.length === 0}
                >
                  {publishingModule ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Publish ({assignedStudentIds.length} selected)
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Module Confirmation Dialog */}
      <Dialog open={deleteModuleOpen} onOpenChange={setDeleteModuleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Delete Module
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{moduleToDelete?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300">
              This will permanently delete:
            </p>
            <ul className="mt-2 text-sm text-[var(--text-muted)] list-disc list-inside space-y-1">
              <li>The module and all its settings</li>
              <li>All {moduleToDelete?.lessons?.length || 0} lessons in this module</li>
              <li>All student progress for these lessons</li>
            </ul>
          </div>

          <DialogFooter className="mt-6">
            <Button 
              variant="glass" 
              onClick={() => {
                setDeleteModuleOpen(false)
                setModuleToDelete(null)
              }}
              disabled={deletingModule}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteModule}
              disabled={deletingModule}
              className="bg-red-500 hover:bg-red-600"
            >
              {deletingModule ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
