"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Palette,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Key,
  Users,
  Copy,
  Check,
  X,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useTheme, ThemeColor } from "@/lib/contexts/ThemeContext"
import { useSupabaseAuth } from "@/lib/hooks/useSupabaseAuth"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { UniversityRoleGuard } from "@/lib/guards/UniversityRoleGuard"
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
import { 
  getInstructorCourses, 
  getCourseStudents, 
  removeStudentFromCourse,
  type Course,
  type UserProfile
} from "@/lib/supabase/universityUtils"

function InstructorSettingsContent() {
  const router = useRouter()
  const { user } = useSupabaseAuthContext()
  const { signOut } = useSupabaseAuth()
  const { themeColor, setThemeColor, availableColors } = useTheme()
  
  // Course management state
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)
  const [courseStudents, setCourseStudents] = useState<Record<string, UserProfile[]>>({})
  const [loadingStudents, setLoadingStudents] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [removingStudent, setRemovingStudent] = useState<string | null>(null)
  
  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  // Load instructor's courses
  useEffect(() => {
    async function loadCourses() {
      if (!user) return
      setLoadingCourses(true)
      const data = await getInstructorCourses(user.id)
      setCourses(data)
      setLoadingCourses(false)
    }
    loadCourses()
  }, [user])

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleToggleCourse = async (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null)
      return
    }
    
    setExpandedCourse(courseId)
    
    // Load students if not already loaded
    if (!courseStudents[courseId]) {
      setLoadingStudents(courseId)
      const students = await getCourseStudents(courseId)
      setCourseStudents(prev => ({ ...prev, [courseId]: students }))
      setLoadingStudents(null)
    }
  }

  const handleRemoveStudent = async (courseId: string, studentId: string) => {
    setRemovingStudent(studentId)
    
    const success = await removeStudentFromCourse(courseId, studentId)
    
    if (success) {
      setCourseStudents(prev => ({
        ...prev,
        [courseId]: prev[courseId].filter(s => s.id !== studentId)
      }))
    }
    
    setRemovingStudent(null)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return
    
    setDeleting(true)
    
    try {
      localStorage.removeItem('tradenova:universityRole')
      localStorage.removeItem('tradenova:intendedRole')
      
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error deleting account:', error)
    }
    
    setDeleting(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/university/courses"
          className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to courses
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Instructor Settings</h1>
          <p className="text-[var(--text-muted)]">
            Manage your courses and account settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Accent Color */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--theme-primary))]/20 flex items-center justify-center">
                <Palette className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Accent Color</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Choose your preferred accent color
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {availableColors.map(({ key, colors }) => (
                <button
                  key={key}
                  onClick={() => setThemeColor(key)}
                  className={`relative w-full aspect-square rounded-xl transition-all ${
                    themeColor === key 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-primary)]' 
                      : 'hover:scale-110'
                  }`}
                  style={{ background: `linear-gradient(135deg, ${colors.gradientFrom}, ${colors.gradientTo})` }}
                  title={colors.name}
                >
                  {themeColor === key && (
                    <CheckCircle2 className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Course Access Codes */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Course Access Codes</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  View and manage your course join codes
                </p>
              </div>
            </div>

            {loadingCourses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[var(--text-muted)] animate-spin" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)]">No courses created yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => (
                  <div key={course.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                    {/* Course Header */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-theme-gradient/20 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{course.name}</h3>
                          <p className="text-xs text-[var(--text-muted)]">{course.code}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Access Code */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                          <Key className="w-4 h-4 text-[var(--text-muted)]" />
                          <code className="text-sm font-mono text-white">{course.access_code}</code>
                          <button
                            onClick={() => handleCopyCode(course.access_code)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Copy code"
                          >
                            {copiedCode === course.access_code ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                          </button>
                        </div>
                        
                        {/* Expand/Collapse Students */}
                        <button
                          onClick={() => handleToggleCourse(course.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          {expandedCourse === course.id ? (
                            <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Students List (Expanded) */}
                    {expandedCourse === course.id && (
                      <div className="border-t border-white/10 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-[var(--text-muted)]" />
                          <span className="text-sm text-[var(--text-muted)]">
                            Students ({courseStudents[course.id]?.length || 0})
                          </span>
                        </div>
                        
                        {loadingStudents === course.id ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
                          </div>
                        ) : (courseStudents[course.id]?.length || 0) === 0 ? (
                          <p className="text-sm text-[var(--text-muted)] text-center py-4">
                            No students enrolled yet
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {courseStudents[course.id]?.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-theme-gradient flex items-center justify-center text-xs font-bold text-white uppercase">
                                    {student.full_name?.charAt(0) || 'S'}
                                  </div>
                                  <span className="text-sm text-white">
                                    {student.full_name || 'Student'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleRemoveStudent(course.id, student.id)}
                                  disabled={removingStudent === student.id}
                                  className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                                  title="Remove student"
                                >
                                  {removingStudent === student.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Account Info */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-[var(--text-muted)]">Email</span>
                <span className="text-white">{user?.email || 'Not available'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-[var(--text-muted)]">Role</span>
                <span className="text-white">Instructor</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-[var(--text-muted)]">Courses Created</span>
                <span className="text-white">{courses.length}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[var(--text-muted)]">Account Created</span>
                <span className="text-white">
                  {user?.created_at 
                    ? new Date(user.created_at).toLocaleDateString()
                    : 'Not available'}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Danger Zone */}
          <GlassCard className="p-6 border-red-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Irreversible actions
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-white">Delete Account</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Permanently delete your account, courses, and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-400">Delete Account</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your account,
                all your courses, and remove all associated data from our servers.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4">
              <p className="text-sm text-[var(--text-muted)] mb-2">
                Type <strong className="text-white">DELETE</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>

            <DialogFooter>
              <Button variant="glass" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
              >
                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function InstructorSettingsPage() {
  return (
    <UniversityRoleGuard allowedRoles={['instructor']}>
      <InstructorSettingsContent />
    </UniversityRoleGuard>
  )
}

