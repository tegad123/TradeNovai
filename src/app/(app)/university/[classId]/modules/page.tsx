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
import { getCourseStudents, type Lesson, type UserProfile } from "@/lib/supabase/universityUtils"
import { Switch } from "@/components/ui/switch"

export default function ModulesPage() {
  const params = useParams()
  const classId = params.classId as string
  const { currentCourse, currentRole, currentUser } = useUniversity()
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [removingVideo, setRemovingVideo] = useState(false)
  const [markingComplete, setMarkingComplete] = useState<string | null>(null)
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
    unassignModule
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

      setCreateModuleOpen(false)
      setNewModuleTitle("")
      setNewModuleDescription("")
    } catch (err) {
      alert(`Error creating module: ${String(err)}`)
    } finally {
      setCreatingModule(false)
    }
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

                return (
                  <GlassCard key={module.id} className="overflow-hidden">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        {isExpanded ? (
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
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {completedCount}/{totalCount} lessons
                        </p>
                      </div>
                      {isInstructor && (
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
                      )}
                      {completedCount === totalCount && totalCount > 0 && (
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
                          <video
                            ref={videoRef}
                            controls
                            className="w-full h-full"
                            src={selectedLesson.video_url}
                            onEnded={handleVideoEnded}
                          >
                            Your browser does not support the video tag.
                          </video>
                          {/* Only show remove button to instructors */}
                          {isInstructor && (
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                Remove Video
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center">
                          {isInstructor ? (
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
                                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/5 transition-colors"
                              >
                                {uploadingVideo ? (
                                  <Loader2 className="w-12 h-12 text-[hsl(var(--theme-primary))] animate-spin" />
                                ) : (
                                  <Upload className="w-12 h-12 text-white/30" />
                                )}
                                <span className="text-[var(--text-muted)]">
                                  {uploadingVideo ? 'Uploading...' : 'Click to upload video'}
                                </span>
                              </button>
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
    </PageContainer>
  )
}
