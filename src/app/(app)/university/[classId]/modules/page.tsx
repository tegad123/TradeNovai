"use client"

import { useState, useRef } from "react"
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
import type { Lesson } from "@/lib/supabase/universityUtils"

export default function ModulesPage() {
  const params = useParams()
  const classId = params.classId as string
  const { currentCourse, currentRole, currentUser } = useUniversity()
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [markingComplete, setMarkingComplete] = useState<string | null>(null)
  const [createModuleOpen, setCreateModuleOpen] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [newModuleDescription, setNewModuleDescription] = useState("")
  const [creatingModule, setCreatingModule] = useState(false)
  const [createLessonOpen, setCreateLessonOpen] = useState(false)
  const [createLessonModuleId, setCreateLessonModuleId] = useState<string | null>(null)
  const [newLessonTitle, setNewLessonTitle] = useState("")
  const [creatingLesson, setCreatingLesson] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    modules,
    loading,
    totalLessons,
    completedLessons,
    progressPercent,
    markLessonComplete,
    updateLesson,
    createModule,
    createLesson
  } = useUniversityModules(currentCourse?.id || null)

  const isInstructor = currentRole === 'instructor'

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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedLesson || !currentUser) return

    const file = e.target.files[0]
    setUploadingVideo(true)

    try {
      const result = await uploadLessonVideo(file, currentUser.id)
      
      if (result.success && result.url) {
        await updateLesson(selectedLesson.id, { video_url: result.url })
        setSelectedLesson(prev => prev ? { ...prev, video_url: result.url } : null)
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'modules/page.tsx:handleCreateModule',message:'submit create module',data:{courseId:currentCourse.id,title:newModuleTitle.trim(),hasDescription:!!newModuleDescription.trim()},timestamp:Date.now(),sessionId:'debug-session',runId:'modules-create-v5',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    try {
      const result = await createModule({
        title: newModuleTitle.trim(),
        description: newModuleDescription.trim() || undefined,
        order: modules.length,
      })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'modules/page.tsx:handleCreateModule',message:'create module result',data:{success:!!result,moduleId:result?.id||null},timestamp:Date.now(),sessionId:'debug-session',runId:'modules-create-v5',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      if (!result) {
        alert("Failed to create module. This is usually caused by missing Supabase tables (run 003_university_tables.sql) or RLS blocking inserts.")
        return
      }

      setCreateModuleOpen(false)
      setNewModuleTitle("")
      setNewModuleDescription("")
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'modules/page.tsx:handleCreateModule',message:'create module threw',data:{error:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'modules-create-v5',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
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

    const module = modules.find(m => m.id === createLessonModuleId)
    const lessonCount = module?.lessons?.length || 0

    setCreatingLesson(true)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'modules/page.tsx:handleCreateLesson',message:'submit create lesson',data:{moduleId:createLessonModuleId,title:newLessonTitle.trim(),order:lessonCount},timestamp:Date.now(),sessionId:'debug-session',runId:'modules-lesson-v1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    try {
      const lesson = await createLesson(createLessonModuleId, {
        title: newLessonTitle.trim(),
        order: lessonCount,
      })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'modules/page.tsx:handleCreateLesson',message:'create lesson result',data:{success:!!lesson,lessonId:lesson?.id||null},timestamp:Date.now(),sessionId:'debug-session',runId:'modules-lesson-v1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

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
                onClick={() => {
                  setCreateModuleOpen(true)
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'modules/page.tsx:AddModuleButton',message:'open create module dialog',data:{courseId:currentCourse?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'modules-create-v4',hypothesisId:'H1'})}).catch(()=>{});
                  // #endregion
                }}
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
                        <h3 className="font-medium text-white">{module.title}</h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          {completedCount}/{totalCount} lessons
                        </p>
                      </div>
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
                        <h2 className="text-xl font-bold text-white">{selectedLesson.title}</h2>
                        {selectedLesson.duration_minutes && (
                          <p className="text-sm text-[var(--text-muted)] flex items-center gap-1 mt-1">
                            <Clock className="w-4 h-4" />
                            {selectedLesson.duration_minutes} minutes
                          </p>
                        )}
                      </div>
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
                    </div>

                    {/* Video player or placeholder */}
                    <div className="aspect-video rounded-xl bg-black/50 flex items-center justify-center overflow-hidden">
                      {selectedLesson.video_url ? (
                        <video
                          controls
                          className="w-full h-full"
                          src={selectedLesson.video_url}
                        >
                          Your browser does not support the video tag.
                        </video>
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
    </PageContainer>
  )
}
