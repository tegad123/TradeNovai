// Supabase University/LMS Utilities
import { createClientSafe } from './browser'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================
// Types
// ============================================

export interface Course {
  id: string
  instructor_id: string
  name: string
  code: string
  description: string | null
  cover_image_url: string | null
  access_code: string
  created_at: string
  updated_at: string
  // Joined data
  instructor_name?: string
  enrolled_count?: number
}

export interface CourseEnrollment {
  id: string
  user_id: string
  course_id: string
  role: 'student' | 'instructor'
  enrolled_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string | null
  order: number
  is_published: boolean
  is_restricted: boolean
  created_at: string
  lessons?: Lesson[]
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  content: string | null
  video_url: string | null
  order: number
  duration_minutes: number | null
  created_at: string
  is_completed?: boolean
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  is_completed: boolean
  completed_at: string | null
}

export interface Assignment {
  id: string
  course_id: string
  title: string
  description: string | null
  due_date: string | null
  points: number
  type: 'reflection' | 'trade_analysis' | 'quiz' | 'journal'
  is_published: boolean
  is_restricted: boolean
  attachments: string[]
  created_at: string
}

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  content: string
  attachments: string[]
  file_url: string | null
  submitted_at: string
  grade: number | null
  feedback: string | null
  graded_at: string | null
  graded_by: string | null
  is_late: boolean
  status: 'pending' | 'submitted' | 'graded' | 'returned'
  // Joined data
  student_name?: string
  assignment_title?: string
  assignment_due_date?: string
}

export interface SubmissionComment {
  id: string
  submission_id: string
  user_id: string
  content: string
  created_at: string
  // Joined data
  user_name?: string
}

export interface MessageThread {
  id: string
  course_id: string
  subject: string
  created_by: string
  created_at: string
  updated_at: string
  // Joined data
  participants?: ThreadParticipant[]
  last_message?: Message
}

export interface ThreadParticipant {
  id: string
  thread_id: string
  user_id: string
  user_name?: string
  avatar_url?: string
}

export interface Message {
  id: string
  thread_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  // Joined data
  sender_name?: string
  sender_role?: 'student' | 'instructor'
}

export interface UniversityTradeLog {
  id: string
  course_id: string
  student_id: string
  user_id?: string  // Alias for student_id in some contexts
  trade_date: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  exit_price: number
  pnl: number
  reflection: string
  screenshot_url: string | null
  screenshots: string[]
  submitted_at: string
  feedback: string | null
  instructor_feedback: string | null
  feedback_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  // Joined data
  student_name?: string
}

export interface StudentProgress {
  user_id: string
  user_name: string
  avatar_url?: string
  course_id: string
  lessons_completed: number
  total_lessons: number
  assignments_completed: number
  total_assignments: number
  average_grade: number
  trade_logs_submitted: number
  last_active: string
}

export interface UserProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

// ============================================
// Helper to get client
// ============================================

function getClient(): SupabaseClient | null {
  return createClientSafe()
}

// ============================================
// Course Management
// ============================================

export async function createCourse(
  instructorId: string,
  data: {
    name: string
    code: string
    access_code: string
    description?: string
    cover_image_url?: string
  }
): Promise<Course | null> {
  const supabase = getClient()
  if (!supabase) throw new Error("Supabase client not initialized (missing env vars or client init failed).")

  const accessCode = data.access_code.trim()
  if (!accessCode) {
    throw new Error("createCourse failed: access_code is required")
  }

  const { data: course, error } = await supabase
    .from('courses')
    .insert({
      instructor_id: instructorId,
      name: data.name,
      code: data.code,
      description: data.description || null,
      cover_image_url: data.cover_image_url || null,
      access_code: accessCode
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating course:', error)
    throw new Error(`createCourse failed: ${error.message}`)
  }

  // Auto-enroll instructor
  const { error: enrollError } = await supabase.from('course_enrollments').insert({
    user_id: instructorId,
    course_id: course.id,
    role: 'instructor'
  })
  if (enrollError) {
    console.error('Error enrolling instructor:', enrollError)
  }

  return course
}

export async function getCourseByAccessCode(accessCode: string): Promise<Course | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .rpc('get_course_by_access_code', { p_access_code: accessCode })
    .single()

  if (error || !data) {
    return null
  }

  return data as Course
}

export async function joinCourse(
  userId: string,
  accessCode: string
): Promise<{ success: boolean; course?: Course; error?: string }> {
  const supabase = getClient()
  if (!supabase) return { success: false, error: 'Client not initialized' }

  // Find course by access code
  const course = await getCourseByAccessCode(accessCode)
  if (!course) {
    return { success: false, error: 'Invalid access code' }
  }

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', course.id)
    .single()

  if (existing) {
    return { success: true, course } // Already enrolled
  }

  // Create enrollment
  const { error } = await supabase.from('course_enrollments').insert({
    user_id: userId,
    course_id: course.id,
    role: 'student'
  })

  if (error) {
    console.error('Error joining course:', error)
    return { success: false, error: 'Failed to join course' }
  }

  return { success: true, course }
}

export async function getUserCourses(userId: string): Promise<Course[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data: enrollments, error } = await supabase
    .from('course_enrollments')
    .select(`
      role,
      course:courses (
        id,
        instructor_id,
        name,
        code,
        description,
        cover_image_url,
        access_code,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)

  if (error || !enrollments) {
    console.error('Error fetching courses:', error)
    return []
  }

  // Get enrolled counts for each course
  const courses = await Promise.all(
    enrollments.map(async (e) => {
      const course = e.course as unknown as Course
      
      // Get enrolled count
      const { count } = await supabase
        .from('course_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id)
        .eq('role', 'student')

      // Get instructor name from profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', course.instructor_id)
        .single()

      return {
        ...course,
        enrolled_count: count || 0,
        instructor_name: profile?.full_name || 'Instructor'
      }
    })
  )

  return courses
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (error) {
    console.error('Error fetching course:', error)
    return null
  }

  return data
}

export async function getUserRoleInCourse(
  userId: string, 
  courseId: string
): Promise<'student' | 'instructor' | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data } = await supabase
    .from('course_enrollments')
    .select('role')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single()

  return data?.role as 'student' | 'instructor' | null
}

// ============================================
// Modules/Lessons
// ============================================

export async function getModulesByCourse(courseId: string): Promise<Module[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('modules')
    .select(`
      *,
      lessons (
        id,
        module_id,
        title,
        content,
        video_url,
        order,
        duration_minutes,
        created_at
      )
    `)
    .eq('course_id', courseId)
    .order('order', { ascending: true })

  if (error) {
    console.error('Error fetching modules:', error)
    return []
  }

  // Sort lessons within each module
  return data.map(module => ({
    ...module,
    lessons: (module.lessons || []).sort((a: Lesson, b: Lesson) => a.order - b.order)
  }))
}

export async function getModulesWithProgress(
  courseId: string,
  userId: string
): Promise<Module[]> {
  const supabase = getClient()
  if (!supabase) return []

  // Get modules with lessons
  const modules = await getModulesByCourse(courseId)

  // Get user's lesson progress
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, is_completed')
    .eq('user_id', userId)

  const progressMap = new Map(progress?.map(p => [p.lesson_id, p.is_completed]) || [])

  // Add completion status to lessons
  return modules.map(module => ({
    ...module,
    lessons: module.lessons?.map(lesson => ({
      ...lesson,
      is_completed: progressMap.get(lesson.id) || false
    }))
  }))
}

export async function createModule(
  courseId: string,
  data: { title: string; description?: string; order?: number }
): Promise<Module | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: module, error } = await supabase
    .from('modules')
    .insert({
      course_id: courseId,
      title: data.title,
      description: data.description || null,
      order: data.order || 0,
      is_published: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating module:', error)
    throw new Error(`createModule failed: ${error.message}`)
  }

  return module
}

export async function updateModule(
  moduleId: string,
  data: Partial<{ title: string; description: string; order: number; is_published: boolean; is_restricted: boolean }>
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('modules')
    .update(data)
    .eq('id', moduleId)

  if (error) {
    console.error('Error updating module:', error)
    return false
  }

  return true
}

export async function createLesson(
  moduleId: string,
  data: { title: string; content?: string; video_url?: string; order?: number; duration_minutes?: number }
): Promise<Lesson | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: lesson, error } = await supabase
    .from('lessons')
    .insert({
      module_id: moduleId,
      title: data.title,
      content: data.content || null,
      video_url: data.video_url || null,
      order: data.order || 0,
      duration_minutes: data.duration_minutes || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating lesson:', error)
    return null
  }

  return lesson
}

export async function updateLesson(
  lessonId: string,
  data: Partial<{ title: string; content: string; video_url: string; order: number; duration_minutes: number }>
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('lessons')
    .update(data)
    .eq('id', lessonId)

  if (error) {
    console.error('Error updating lesson:', error)
    return false
  }

  return true
}

export async function markLessonComplete(
  userId: string,
  lessonId: string,
  completed: boolean = true
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('lesson_progress')
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null
    }, {
      onConflict: 'user_id,lesson_id'
    })

  if (error) {
    console.error('Error updating lesson progress:', error)
    return false
  }

  return true
}

// ============================================
// Assignments/Submissions
// ============================================

export async function getAssignmentsByCourse(courseId: string): Promise<Assignment[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('course_id', courseId)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching assignments:', error)
    return []
  }

  return data
}

export async function createAssignment(
  courseId: string,
  data: {
    title: string
    description?: string
    due_date?: string
    points?: number
    type?: 'reflection' | 'trade_analysis' | 'quiz' | 'journal'
    attachments?: string[]
    is_restricted?: boolean
  }
): Promise<Assignment | null> {
  const supabase = getClient()
  if (!supabase) return null

  const insertPayload = {
    course_id: courseId,
    title: data.title,
    description: data.description || null,
    due_date: data.due_date || null,
    points: data.points || 100,
    type: data.type || 'reflection',
    attachments: data.attachments || [],
    is_restricted: data.is_restricted || false,
    is_published: false
  }

  let { data: assignment, error } = await supabase
    .from('assignments')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    // If the DB is missing newer columns (migration not applied), retry without them.
    // This keeps assignment creation working (attachments/features will be disabled until migration runs).
    const isMissingColumn =
      (error as any)?.code === 'PGRST204' &&
      typeof error.message === 'string' &&
      (error.message.includes("'attachments'") || error.message.includes("'is_restricted'"))

    if (isMissingColumn) {
      const legacyPayload: any = { ...insertPayload }
      delete legacyPayload.attachments
      delete legacyPayload.is_restricted

      const retry = await supabase
        .from('assignments')
        .insert(legacyPayload)
        .select()
        .single()

      assignment = retry.data as any
      error = retry.error as any

      if (!error) {
        return assignment
      }
    }

    console.error('Error creating assignment:', error)
    throw new Error(`createAssignment failed: ${error.message}`)
  }

  return assignment
}

export async function submitAssignment(
  assignmentId: string,
  studentId: string,
  content: string,
  attachments: string[] = []
): Promise<Submission | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('submissions')
    .upsert({
      assignment_id: assignmentId,
      student_id: studentId,
      content,
      attachments,
      submitted_at: new Date().toISOString(),
      status: 'submitted'
    }, {
      onConflict: 'assignment_id,student_id'
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting assignment:', error)
    return null
  }

  return data
}

export async function gradeSubmission(
  submissionId: string,
  grade: number,
  feedback: string
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('submissions')
    .update({
      grade,
      feedback,
      graded_at: new Date().toISOString(),
      status: 'graded'
    })
    .eq('id', submissionId)

  if (error) {
    console.error('Error grading submission:', error)
    return false
  }

  return true
}

export async function getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching submissions:', error)
    return []
  }

  // Get student names
  const submissions = await Promise.all(
    data.map(async (s) => {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', s.student_id)
        .single()

      return {
        ...s,
        student_name: profile?.full_name || 'Student'
      }
    })
  )

  return submissions
}

export async function getStudentSubmissions(
  studentId: string,
  courseId: string
): Promise<Submission[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      assignment:assignments!inner (
        id,
        title,
        course_id
      )
    `)
    .eq('student_id', studentId)
    .eq('assignment.course_id', courseId)

  if (error) {
    console.error('Error fetching student submissions:', error)
    return []
  }

  return data.map(s => ({
    ...s,
    assignment_title: (s.assignment as unknown as { title: string }).title
  }))
}

export async function getCourseSubmissions(courseId: string): Promise<Submission[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      assignment:assignments!inner (
        id,
        title,
        course_id
      )
    `)
    .eq('assignment.course_id', courseId)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching course submissions:', error)
    return []
  }

  // Get student names
  const submissions = await Promise.all(
    data.map(async (s) => {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', s.student_id)
        .single()

      return {
        ...s,
        student_name: profile?.full_name || 'Student',
        assignment_title: (s.assignment as unknown as { title: string }).title
      }
    })
  )

  return submissions
}

// ============================================
// Messaging
// ============================================

export async function getThreadsByCourse(
  courseId: string,
  userId: string
): Promise<MessageThread[]> {
  const supabase = getClient()
  if (!supabase) return []

  // Get threads where user is a participant
  const { data, error } = await supabase
    .from('message_threads')
    .select(`
      *,
      thread_participants (
        user_id
      )
    `)
    .eq('course_id', courseId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching threads:', error)
    return []
  }

  // Filter to only threads where user is a participant or creator
  const userThreads = data.filter(t => 
    t.created_by === userId || 
    t.thread_participants.some((p: { user_id: string }) => p.user_id === userId)
  )

  // Get last message for each thread
  const threadsWithMessages = await Promise.all(
    userThreads.map(async (thread) => {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false })
        .limit(1)

      // Get participant names
      const participantIds = thread.thread_participants.map((p: { user_id: string }) => p.user_id)
      if (!participantIds.includes(thread.created_by)) {
        participantIds.push(thread.created_by)
      }

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', participantIds)

      const participants = participantIds.map((id: string) => {
        const profile = profiles?.find(p => p.id === id)
        return {
          id: id,
          thread_id: thread.id,
          user_id: id,
          user_name: profile?.full_name || 'User',
          avatar_url: profile?.avatar_url
        }
      })

      return {
        ...thread,
        participants,
        last_message: messages?.[0] || null
      }
    })
  )

  return threadsWithMessages
}

export async function createThread(
  courseId: string,
  creatorId: string,
  subject: string,
  participantIds: string[]
): Promise<MessageThread | null> {
  const supabase = getClient()
  if (!supabase) return null

  // Create thread
  const { data: thread, error } = await supabase
    .from('message_threads')
    .insert({
      course_id: courseId,
      subject,
      created_by: creatorId
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating thread:', error)
    return null
  }

  // Add participants (including creator)
  const participantSet = new Set([...participantIds, creatorId])
  const allParticipants = Array.from(participantSet)
  const participantInserts = allParticipants.map(userId => ({
    thread_id: thread.id,
    user_id: userId
  }))

  const participantsInsert = await supabase.from('thread_participants').insert(participantInserts)
  if (participantsInsert.error) {
    console.error('Error adding thread participants:', participantsInsert.error)
  }

  return thread
}

export async function getMessagesByThread(threadId: string): Promise<Message[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }

  // Get sender names and roles
  const messages = await Promise.all(
    data.map(async (m) => {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', m.sender_id)
        .single()

      // Get role from thread's course enrollment
      const { data: thread } = await supabase
        .from('message_threads')
        .select('course_id')
        .eq('id', threadId)
        .single()

      let senderRole: 'student' | 'instructor' = 'student'
      if (thread) {
        const { data: enrollment } = await supabase
          .from('course_enrollments')
          .select('role')
          .eq('user_id', m.sender_id)
          .eq('course_id', thread.course_id)
          .single()

        senderRole = (enrollment?.role as 'student' | 'instructor') || 'student'
      }

      return {
        ...m,
        sender_name: profile?.full_name || 'User',
        sender_role: senderRole
      }
    })
  )

  return messages
}

export async function sendMessage(
  threadId: string,
  senderId: string,
  content: string
): Promise<Message | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      content,
      is_read: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error sending message:', error)
    return null
  }

  // Update thread's updated_at
  await supabase
    .from('message_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId)

  return data
}

export async function markMessagesRead(
  threadId: string,
  userId: string
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('thread_id', threadId)
    .neq('sender_id', userId)

  if (error) {
    console.error('Error marking messages read:', error)
    return false
  }

  return true
}

// ============================================
// Trade Logs
// ============================================

export async function submitTradeLog(
  courseId: string,
  studentId: string,
  data: {
    trade_date: string
    symbol: string
    side: 'long' | 'short'
    entry_price: number
    exit_price: number
    pnl: number
    reflection: string
    screenshots?: string[]
  }
): Promise<UniversityTradeLog | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: log, error } = await supabase
    .from('university_trade_logs')
    .insert({
      course_id: courseId,
      student_id: studentId,
      trade_date: data.trade_date,
      symbol: data.symbol,
      side: data.side,
      entry_price: data.entry_price,
      exit_price: data.exit_price,
      pnl: data.pnl,
      reflection: data.reflection,
      screenshots: data.screenshots || []
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting trade log:', error)
    return null
  }

  return log
}

export async function getTradeLogsByCourse(courseId: string): Promise<UniversityTradeLog[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('university_trade_logs')
    .select('*')
    .eq('course_id', courseId)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching trade logs:', error)
    return []
  }

  // Get student names
  const logs = await Promise.all(
    data.map(async (log) => {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', log.student_id)
        .single()

      return {
        ...log,
        student_name: profile?.full_name || 'Student'
      }
    })
  )

  return logs
}

export async function getStudentTradeLogs(
  studentId: string,
  courseId: string
): Promise<UniversityTradeLog[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('university_trade_logs')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching student trade logs:', error)
    return []
  }

  return data
}

export async function addFeedbackToTradeLog(
  tradeLogId: string,
  feedback: string
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('university_trade_logs')
    .update({
      instructor_feedback: feedback,
      feedback_at: new Date().toISOString()
    })
    .eq('id', tradeLogId)

  if (error) {
    console.error('Error adding feedback:', error)
    return false
  }

  return true
}

// ============================================
// Progress
// ============================================

export async function getStudentProgress(
  userId: string,
  courseId: string
): Promise<StudentProgress | null> {
  const supabase = getClient()
  if (!supabase) return null

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single()

  // Get lesson progress
  const { data: modules } = await supabase
    .from('modules')
    .select(`
      id,
      lessons (id)
    `)
    .eq('course_id', courseId)

  const allLessons = modules?.flatMap(m => (m.lessons as { id: string }[]).map(l => l.id)) || []
  const totalLessons = allLessons.length

  const { data: lessonProgress } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('is_completed', true)
    .in('lesson_id', allLessons.length > 0 ? allLessons : ['none'])

  const lessonsCompleted = lessonProgress?.length || 0

  // Get assignment submissions
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id')
    .eq('course_id', courseId)

  const assignmentIds = assignments?.map(a => a.id) || []
  const totalAssignments = assignmentIds.length

  const { data: submissions } = await supabase
    .from('submissions')
    .select('grade, status')
    .eq('student_id', userId)
    .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['none'])
    .in('status', ['submitted', 'graded'])

  const assignmentsCompleted = submissions?.length || 0
  // Only graded submissions contribute to average grade
  const grades = submissions?.filter(s => s.status === 'graded' && s.grade !== null).map(s => s.grade as number) || []
  const averageGrade = grades.length > 0
    ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)
    : 0

  // Get trade logs count
  const { count: tradeLogsCount } = await supabase
    .from('university_trade_logs')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', userId)
    .eq('course_id', courseId)

  return {
    user_id: userId,
    user_name: profile?.full_name || 'Student',
    avatar_url: profile?.avatar_url || undefined,
    course_id: courseId,
    lessons_completed: lessonsCompleted,
    total_lessons: totalLessons,
    assignments_completed: assignmentsCompleted,
    total_assignments: totalAssignments,
    average_grade: averageGrade,
    trade_logs_submitted: tradeLogsCount || 0,
    last_active: new Date().toISOString()
  }
}

export async function getCourseProgress(courseId: string): Promise<StudentProgress[]> {
  const supabase = getClient()
  if (!supabase) return []

  // Get all students enrolled in course
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('user_id')
    .eq('course_id', courseId)
    .eq('role', 'student')

  if (!enrollments || enrollments.length === 0) return []

  // Get progress for each student
  const progressList = await Promise.all(
    enrollments.map(e => getStudentProgress(e.user_id, courseId))
  )

  return progressList.filter((p): p is StudentProgress => p !== null)
}

// ============================================
// User Profiles
// ============================================

export async function getOrCreateProfile(
  userId: string,
  name?: string,
  avatarUrl?: string
): Promise<UserProfile | null> {
  const supabase = getClient()
  if (!supabase) return null

  // Try to get existing profile
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (existing) return existing

  // Create new profile
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      full_name: name || null,
      avatar_url: avatarUrl || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    return null
  }

  return data
}

export async function updateProfile(
  userId: string,
  data: { full_name?: string; avatar_url?: string }
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      ...data
    })

  if (error) {
    console.error('Error updating profile:', error)
    return false
  }

  return true
}

export async function getCourseStudents(courseId: string): Promise<UserProfile[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('user_id')
    .eq('course_id', courseId)
    .eq('role', 'student')

  if (!enrollments) return []

  const userIds = enrollments.map(e => e.user_id)
  
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', userIds)

  return profiles || []
}

export async function removeLessonVideo(lessonId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  // 1. Get current video URL
  const { data: lesson } = await supabase
    .from('lessons')
    .select('video_url')
    .eq('id', lessonId)
    .single()

  if (!lesson?.video_url) return true

  // 2. Extract path from URL (if it's a Supabase storage URL)
  // Format: .../storage/v1/object/public/course-assets/e469...
  const bucketPart = '/course-assets/'
  const bucketIndex = lesson.video_url.indexOf(bucketPart)
  if (bucketIndex !== -1) {
    const filePath = lesson.video_url.substring(bucketIndex + bucketPart.length)
    
    // 3. Delete from storage
    const { deleteFile } = await import('./storageUtils')
    await deleteFile(filePath)
  }

  // 4. Update database
  const { error } = await supabase
    .from('lessons')
    .update({ video_url: null })
    .eq('id', lessonId)

  if (error) {
    console.error('Error removing lesson video:', error)
    return false
  }

  return true
}

export async function getModuleAssignments(moduleId: string): Promise<string[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('module_assignments')
    .select('user_id')
    .eq('module_id', moduleId)

  if (error) {
    console.error('Error fetching module assignments:', error)
    return []
  }

  return data.map(a => a.user_id)
}

export async function assignModuleToStudent(moduleId: string, userId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('module_assignments')
    .upsert({ module_id: moduleId, user_id: userId }, { onConflict: 'module_id,user_id' })

  if (error) {
    console.error('Error assigning module:', error)
    return false
  }

  return true
}

export async function unassignModuleFromStudent(moduleId: string, userId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('module_assignments')
    .delete()
    .eq('module_id', moduleId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error unassigning module:', error)
    return false
  }

  return true
}

// ============================================
// Assignment Targeting (Per-Student Assignments)
// ============================================

export async function updateAssignment(
  assignmentId: string,
  data: Partial<{
    title: string
    description: string
    due_date: string
    points: number
    type: 'reflection' | 'trade_analysis' | 'quiz' | 'journal'
    is_published: boolean
    is_restricted: boolean
    attachments: string[]
  }>
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  let { error } = await supabase
    .from('assignments')
    .update(data)
    .eq('id', assignmentId)

  if (error) {
    const isMissingColumn =
      (error as any)?.code === 'PGRST204' &&
      typeof error.message === 'string' &&
      (error.message.includes("'attachments'") || error.message.includes("'is_restricted'"))

    if (isMissingColumn) {
      const legacyData: any = { ...data }
      delete legacyData.attachments
      delete legacyData.is_restricted

      const retry = await supabase
        .from('assignments')
        .update(legacyData)
        .eq('id', assignmentId)

      if (!retry.error) return true
      error = retry.error as any
    }

    console.error('Error updating assignment:', error)
    return false
  }

  return true
}

export async function getAssignmentTargets(assignmentId: string): Promise<string[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('assignment_targets')
    .select('user_id')
    .eq('assignment_id', assignmentId)

  if (error) {
    console.error('Error fetching assignment targets:', error)
    return []
  }

  return data.map(t => t.user_id)
}

export async function assignAssignmentToStudent(assignmentId: string, userId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('assignment_targets')
    .upsert({ assignment_id: assignmentId, user_id: userId }, { onConflict: 'assignment_id,user_id' })

  if (error) {
    console.error('Error assigning assignment to student:', error)
    return false
  }

  return true
}

export async function unassignAssignmentFromStudent(assignmentId: string, userId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('assignment_targets')
    .delete()
    .eq('assignment_id', assignmentId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error unassigning assignment from student:', error)
    return false
  }

  return true
}

// ============================================
// Assignment Submissions with File Upload
// ============================================

export async function submitAssignmentWithFile(
  assignmentId: string,
  studentId: string,
  content: string,
  fileUrl?: string
): Promise<Submission | null> {
  const supabase = getClient()
  if (!supabase) return null

  // Get assignment to check due date for late submission
  const { data: assignment } = await supabase
    .from('assignments')
    .select('due_date')
    .eq('id', assignmentId)
    .single()

  const now = new Date()
  const isLate = assignment?.due_date ? new Date(assignment.due_date) < now : false

  const { data, error } = await supabase
    .from('submissions')
    .upsert({
      assignment_id: assignmentId,
      student_id: studentId,
      content,
      file_url: fileUrl || null,
      submitted_at: now.toISOString(),
      status: 'submitted',
      is_late: isLate
    }, {
      onConflict: 'assignment_id,student_id'
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting assignment:', error)
    return null
  }

  return data
}

export async function getStudentVisibleAssignments(
  courseId: string,
  studentId: string
): Promise<Assignment[]> {
  const supabase = getClient()
  if (!supabase) return []

  // Get all assignments for the course
  const { data: allAssignments, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('course_id', courseId)
    .order('due_date', { ascending: true })

  if (error || !allAssignments) {
    console.error('Error fetching assignments:', error)
    return []
  }

  // Get assignment targets for restricted assignments
  const restrictedIds = allAssignments.filter(a => a.is_restricted).map(a => a.id)
  
  if (restrictedIds.length === 0) {
    return allAssignments
  }

  const { data: targets } = await supabase
    .from('assignment_targets')
    .select('assignment_id')
    .eq('user_id', studentId)
    .in('assignment_id', restrictedIds)

  const assignedRestrictedIds = new Set(targets?.map(t => t.assignment_id) || [])

  // Filter: include unrestricted OR student is assigned
  return allAssignments.filter(a => 
    !a.is_restricted || assignedRestrictedIds.has(a.id)
  )
}

// ============================================
// Submission Comments
// ============================================

export async function getSubmissionComments(submissionId: string): Promise<SubmissionComment[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('submission_comments')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching submission comments:', error)
    return []
  }

  // Get user names
  const comments = await Promise.all(
    data.map(async (c) => {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', c.user_id)
        .single()

      return {
        ...c,
        user_name: profile?.full_name || 'User'
      }
    })
  )

  return comments
}

export async function addSubmissionComment(
  submissionId: string,
  userId: string,
  content: string
): Promise<SubmissionComment | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('submission_comments')
    .insert({
      submission_id: submissionId,
      user_id: userId,
      content
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding submission comment:', error)
    return null
  }

  return data
}

// ============================================
// Trade Log Comments
// ============================================

export interface TradeLogComment {
  id: string
  trade_log_id: string
  user_id: string
  content: string
  created_at: string
  user_name?: string
}

export async function getTradeLogComments(tradeLogId: string): Promise<TradeLogComment[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('trade_log_comments')
    .select('*')
    .eq('trade_log_id', tradeLogId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching trade log comments:', error)
    return []
  }

  const comments = await Promise.all(
    data.map(async (c) => {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', c.user_id)
        .single()

      return {
        ...c,
        user_name: profile?.full_name || 'User'
      }
    })
  )

  return comments
}

export async function addTradeLogComment(
  tradeLogId: string,
  userId: string,
  content: string
): Promise<TradeLogComment | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('trade_log_comments')
    .insert({
      trade_log_id: tradeLogId,
      user_id: userId,
      content
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding trade log comment:', error)
    return null
  }

  return data
}

// Update trade log with screenshot and enhanced feedback
export async function submitTradeLogWithScreenshot(
  courseId: string,
  studentId: string,
  data: {
    trade_date: string
    symbol: string
    side: 'long' | 'short'
    entry_price: number
    exit_price: number
    pnl: number
    reflection: string
    screenshot_url?: string
    screenshots?: string[]
  }
): Promise<UniversityTradeLog | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: log, error } = await supabase
    .from('university_trade_logs')
    .insert({
      course_id: courseId,
      student_id: studentId,
      trade_date: data.trade_date,
      symbol: data.symbol,
      side: data.side,
      entry_price: data.entry_price,
      exit_price: data.exit_price,
      pnl: data.pnl,
      reflection: data.reflection,
      screenshot_url: data.screenshot_url || null,
      screenshots: data.screenshots || []
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting trade log:', error)
    return null
  }

  return log
}

// ============================================
// Course Instructor Helper
// ============================================

export async function getCourseInstructor(courseId: string): Promise<UserProfile | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: course } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', courseId)
    .single()

  if (!course) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', course.instructor_id)
    .single()

  return profile
}

