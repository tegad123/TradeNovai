"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  GraduationCap,
  Users,
  BookOpen,
  Plus,
  ArrowRight,
  Loader2,
  Key,
} from "lucide-react"
import { useUniversity } from "@/lib/contexts/UniversityContext"
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

export default function UniversityPage() {
  const router = useRouter()
  const { courses, currentRole, joinCourse, createCourse, setCurrentCourse, isLoading } = useUniversity()
  const [accessCode, setAccessCode] = useState("")
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState("")
  const [showCreateCourse, setShowCreateCourse] = useState(false)
  const [creatingCourse, setCreatingCourse] = useState(false)
  const [newCourseName, setNewCourseName] = useState("")
  const [newCourseCode, setNewCourseCode] = useState("")
  const [newCourseDescription, setNewCourseDescription] = useState("")

  const isInstructor = currentRole === 'instructor'

  const handleJoinCourse = async () => {
    if (!accessCode.trim()) {
      setError("Please enter an access code")
      return
    }

    setJoining(true)
    setError("")

    const course = await joinCourse(accessCode.trim())

    if (course) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'university/page.tsx:handleJoinCourse',message:'joined course',data:{courseId:course.id},timestamp:Date.now(),sessionId:'debug-session',runId:'course-join-v1',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      router.push(`/university/${course.id}/home`)
    } else {
      setError("Invalid access code. Please check and try again.")
    }

    setJoining(false)
  }

  const handleCreateCourse = async () => {
    if (!newCourseName.trim() || !newCourseCode.trim()) return
    setCreatingCourse(true)
    setError("")

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'university/page.tsx:handleCreateCourse',message:'create course submit',data:{code:newCourseCode.trim(),hasName:!!newCourseName.trim()},timestamp:Date.now(),sessionId:'debug-session',runId:'course-create-v1',hypothesisId:'H6'})}).catch(()=>{});
    // #endregion

    let course: any = null
    try {
      course = await createCourse({
        name: newCourseName.trim(),
        code: newCourseCode.trim(),
        description: newCourseDescription.trim() || undefined,
      })
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'university/page.tsx:handleCreateCourse',message:'createCourse threw',data:{error:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'course-create-v2',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      setError(String(err))
      alert(`Create course failed: ${String(err)}`)
      setCreatingCourse(false)
      return
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'university/page.tsx:handleCreateCourse',message:'create course result',data:{success:!!course,courseId:course?.id||null},timestamp:Date.now(),sessionId:'debug-session',runId:'course-create-v1',hypothesisId:'H6'})}).catch(()=>{});
    // #endregion

    if (!course) {
      setError("Failed to create course. Make sure you ran `003_university_tables.sql` in Supabase and you're signed in.")
      alert("Failed to create course (returned null). Check Supabase migration + RLS.")
      setCreatingCourse(false)
      return
    }

    setShowCreateCourse(false)
    setNewCourseName("")
    setNewCourseCode("")
    setNewCourseDescription("")
    setCreatingCourse(false)
    router.push(`/university/${course.id}/home`)
  }

  const handleSelectCourse = (courseId: string) => {
    const course = courses.find(c => c.id === courseId)
    if (course) {
      setCurrentCourse(course)
      router.push(`/university/${course.id}/home`)
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
        </div>
      </PageContainer>
    )
  }

  // If user has no courses, show join screen
  if (courses.length === 0) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <GlassCard className="p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-theme-gradient mx-auto mb-6 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to TradeNova University</h1>
            <p className="text-[var(--text-muted)] mb-8">
              {isInstructor 
                ? "Create your first course to get started"
                : "Enter an access code to join a course"}
            </p>

            {isInstructor ? (
              <Button 
                variant="glass-theme" 
                className="w-full"
                onClick={() => setShowCreateCourse(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-[var(--text-muted)] text-left block">Access Code</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="e.g., FTF2024"
                      value={accessCode}
                      onChange={(e) => {
                        setAccessCode(e.target.value.toUpperCase())
                        setError("")
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleJoinCourse()
                      }}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center font-mono text-lg placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-400 text-left">{error}</p>
                  )}
                </div>
                
                <Button 
                  variant="glass-theme" 
                  className="w-full"
                  onClick={handleJoinCourse}
                  disabled={joining}
                >
                  {joining ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Join Course
                </Button>
              </div>
            )}

            {isInstructor && error && (
              <p className="mt-4 text-sm text-red-400 text-left whitespace-pre-wrap">{error}</p>
            )}
          </GlassCard>
        </div>

        <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create course</DialogTitle>
              <DialogDescription>Create a new university course for your students.</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-[var(--text-muted)]">Course name</label>
                <input
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="e.g. Futures Trading Fundamentals"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[var(--text-muted)]">Course code</label>
                <input
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FTF-101"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-[var(--text-muted)]">Description (optional)</label>
                <textarea
                  value={newCourseDescription}
                  onChange={(e) => setNewCourseDescription(e.target.value)}
                  rows={3}
                  placeholder="What is this course about?"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="glass" onClick={() => setShowCreateCourse(false)} disabled={creatingCourse}>
                Cancel
              </Button>
              <Button
                variant="glass-theme"
                onClick={handleCreateCourse}
                disabled={creatingCourse || !newCourseName.trim() || !newCourseCode.trim()}
              >
                {creatingCourse ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create course
              </Button>
            </DialogFooter>

            {error && (
              <p className="mt-4 text-sm text-red-400 whitespace-pre-wrap">{error}</p>
            )}
          </DialogContent>
        </Dialog>
      </PageContainer>
    )
  }

  // User has courses, show course picker
  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Courses</h1>
            <p className="text-[var(--text-muted)]">
              Select a course to continue learning
            </p>
          </div>
          
          {!isInstructor && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="w-32 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
              />
              <Button 
                variant="glass-theme" 
                size="sm"
                onClick={handleJoinCourse}
                disabled={joining || !accessCode.trim()}
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => handleSelectCourse(course.id)}
              className="text-left group"
            >
              <GlassCard className="p-6 h-full hover:bg-white/[0.08] transition-all group-hover:ring-2 ring-[hsl(var(--theme-primary))]/50">
                {/* Course Cover */}
                <div className="aspect-video rounded-xl bg-theme-gradient/20 mb-4 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-[hsl(var(--theme-primary))] opacity-50" />
                </div>

                {/* Course Info */}
                <div className="space-y-2">
                  <p className="text-xs text-[hsl(var(--theme-primary))] font-medium">{course.code}</p>
                  <h3 className="text-lg font-semibold text-white group-hover:text-[hsl(var(--theme-primary))] transition-colors">
                    {course.name}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                    {course.description}
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Users className="w-4 h-4" />
                    <span>{course.enrolled_count || 0} students</span>
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">
                    by {course.instructor_name || 'Instructor'}
                  </span>
                </div>
              </GlassCard>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}
      </div>
    </PageContainer>
  )
}
