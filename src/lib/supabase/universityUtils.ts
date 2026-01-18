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
  prerequisite_module_id: string | null
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

  // Log enrollment activity
  logActivity(
    userId,
    course.id,
    'course_enrolled',
    `Enrolled in course: ${course.name}`
  ).catch(() => {}) // Fire and forget

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
  completed: boolean = true,
  courseId?: string
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

  // Log activity if courseId is provided
  if (completed && courseId) {
    logActivity(
      userId,
      courseId,
      'lesson_completed',
      `Completed lesson`,
      { lessonId }
    ).catch(() => {}) // Fire and forget
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

  // Log activity - get course_id from assignment
  const { data: assignment } = await supabase
    .from('assignments')
    .select('course_id')
    .eq('id', assignmentId)
    .single()

  if (assignment?.course_id) {
    logActivity(
      studentId,
      assignment.course_id,
      'assignment_submitted',
      `Submitted assignment`,
      { assignmentId }
    ).catch(() => {}) // Fire and forget
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

  // Log activity - get course_id from thread
  const { data: thread } = await supabase
    .from('message_threads')
    .select('course_id')
    .eq('id', threadId)
    .single()

  if (thread?.course_id) {
    logActivity(
      senderId,
      thread.course_id,
      'message_sent',
      `Sent a message in course discussion`
    ).catch(() => {}) // Fire and forget
  }

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

  // Log activity
  logActivity(
    studentId,
    courseId,
    'trade_log_submitted',
    `Submitted trade log for ${data.symbol} (${data.side})`,
    { metadata: { symbol: data.symbol, side: data.side, pnl: data.pnl } }
  ).catch(() => {}) // Fire and forget

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

  // Build base payload with only core columns that definitely exist
  const upsertPayload: Record<string, unknown> = {
    assignment_id: assignmentId,
    student_id: studentId,
    content,
    submitted_at: now.toISOString(),
    status: 'submitted'
  }
  
  // Optional columns that may not exist in older schemas (from 006_assignments_enhancements.sql)
  // We'll try with them first, then fallback without them if needed
  const optionalFields: Record<string, unknown> = {}
  if (fileUrl) {
    optionalFields.file_url = fileUrl
  }
  optionalFields.is_late = isLate
  
  // First attempt: try with all fields including optional ones
  const fullPayload = { ...upsertPayload, ...optionalFields }

  let { data, error } = await supabase
    .from('submissions')
    .upsert(fullPayload, {
      onConflict: 'assignment_id,student_id'
    })
    .select()
    .single()

  // Fallback: If column doesn't exist (PGRST204), retry without optional columns
  if (error?.code === 'PGRST204') {
    // Retry with only base columns
    const retryResult = await supabase
      .from('submissions')
      .upsert(upsertPayload, {
        onConflict: 'assignment_id,student_id'
      })
      .select()
      .single()
    data = retryResult.data
    error = retryResult.error
  }

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

  // Build screenshots array - combine screenshot_url into screenshots array
  // The DB schema only has `screenshots` (JSONB), not `screenshot_url`
  const screenshotsArray: string[] = data.screenshots ? [...data.screenshots] : []
  if (data.screenshot_url && !screenshotsArray.includes(data.screenshot_url)) {
    screenshotsArray.push(data.screenshot_url)
  }

  const insertPayload = {
    course_id: courseId,
    student_id: studentId,
    trade_date: data.trade_date,
    symbol: data.symbol,
    side: data.side,
    entry_price: data.entry_price,
    exit_price: data.exit_price,
    pnl: data.pnl,
    reflection: data.reflection,
    screenshots: screenshotsArray
  }

  const { data: log, error } = await supabase
    .from('university_trade_logs')
    .insert(insertPayload)
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

// Get all courses for an instructor
export async function getInstructorCourses(instructorId: string): Promise<Course[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching instructor courses:', error)
    return []
  }

  return data || []
}

// Remove a student from a course
export async function removeStudentFromCourse(courseId: string, studentId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('course_enrollments')
    .delete()
    .eq('course_id', courseId)
    .eq('user_id', studentId)
    .eq('role', 'student')

  if (error) {
    console.error('Error removing student from course:', error)
    return false
  }

  return true
}

// ============================================
// MODULE PREREQUISITES
// ============================================

// Set prerequisite module for a module
export async function setModulePrerequisite(moduleId: string, prerequisiteModuleId: string | null): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('modules')
    .update({ prerequisite_module_id: prerequisiteModuleId })
    .eq('id', moduleId)

  if (error) {
    console.error('Error setting module prerequisite:', error)
    return false
  }

  return true
}

// Get prerequisite module for a module
export async function getModulePrerequisite(moduleId: string): Promise<string | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('modules')
    .select('prerequisite_module_id')
    .eq('id', moduleId)
    .single()

  if (error || !data) return null
  return data.prerequisite_module_id
}

// Check if a module is complete for a user (all lessons marked as completed)
export async function isModuleComplete(moduleId: string, userId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  // Get all lessons in the module
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id')
    .eq('module_id', moduleId)

  if (lessonsError || !lessons || lessons.length === 0) return false

  // Get completed lessons for this user
  const lessonIds = lessons.map(l => l.id)
  const { data: progress, error: progressError } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('is_completed', true)
    .in('lesson_id', lessonIds)

  if (progressError) return false

  // Module is complete if all lessons are completed
  return progress?.length === lessons.length
}

// Check if a module is unlocked for a user
export async function isModuleUnlocked(moduleId: string, userId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  // Get the module's prerequisite
  const { data: moduleData, error } = await supabase
    .from('modules')
    .select('prerequisite_module_id')
    .eq('id', moduleId)
    .single()

  if (error || !moduleData) return false

  // No prerequisite means module is unlocked
  if (!moduleData.prerequisite_module_id) return true

  // Check if prerequisite is complete
  return isModuleComplete(moduleData.prerequisite_module_id, userId)
}

// Get module completion status for all modules in a course (for UI display)
export async function getModulesWithLockStatus(
  courseId: string, 
  userId: string
): Promise<{ moduleId: string; isLocked: boolean; prerequisiteModuleId: string | null; prerequisiteModuleTitle: string | null }[]> {
  const supabase = getClient()
  if (!supabase) return []

  // Get all modules with their prerequisites
  const { data: modules, error } = await supabase
    .from('modules')
    .select('id, prerequisite_module_id, title')
    .eq('course_id', courseId)
    .order('order', { ascending: true })

  if (error || !modules) return []

  const result: { moduleId: string; isLocked: boolean; prerequisiteModuleId: string | null; prerequisiteModuleTitle: string | null }[] = []
  
  // Build a map of module titles
  const moduleTitles: Record<string, string> = {}
  modules.forEach(m => { moduleTitles[m.id] = m.title })

  for (const mod of modules) {
    const isUnlocked = await isModuleUnlocked(mod.id, userId)
    result.push({
      moduleId: mod.id,
      isLocked: !isUnlocked,
      prerequisiteModuleId: mod.prerequisite_module_id,
      prerequisiteModuleTitle: mod.prerequisite_module_id ? moduleTitles[mod.prerequisite_module_id] || null : null
    })
  }

  return result
}

// ============================================
// ASSIGNMENT PREREQUISITES (Module-Based)
// ============================================

// Set assignment prerequisites (which modules must be completed)
export async function setAssignmentPrerequisites(assignmentId: string, moduleIds: string[]): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  // First, delete all existing prerequisites for this assignment
  const { error: deleteError } = await supabase
    .from('assignment_module_prerequisites')
    .delete()
    .eq('assignment_id', assignmentId)

  if (deleteError) {
    console.error('Error deleting existing assignment prerequisites:', deleteError)
    return false
  }

  // If no modules, we're done
  if (moduleIds.length === 0) return true

  // Insert new prerequisites
  const insertData = moduleIds.map(moduleId => ({
    assignment_id: assignmentId,
    module_id: moduleId
  }))

  const { error: insertError } = await supabase
    .from('assignment_module_prerequisites')
    .insert(insertData)

  if (insertError) {
    console.error('Error setting assignment prerequisites:', insertError)
    return false
  }

  return true
}

// Get assignment prerequisites (module IDs)
export async function getAssignmentPrerequisites(assignmentId: string): Promise<string[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('assignment_module_prerequisites')
    .select('module_id')
    .eq('assignment_id', assignmentId)

  if (error || !data) return []
  return data.map(d => d.module_id)
}

// Check if an assignment is unlocked for a user (all prerequisite modules complete)
export async function isAssignmentUnlocked(assignmentId: string, userId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  // Get prerequisites for this assignment
  const prerequisites = await getAssignmentPrerequisites(assignmentId)

  // No prerequisites means assignment is unlocked
  if (prerequisites.length === 0) return true

  // Check if all prerequisite modules are complete
  for (const moduleId of prerequisites) {
    const isComplete = await isModuleComplete(moduleId, userId)
    if (!isComplete) return false
  }

  return true
}

// Get assignments with lock status for a user
export async function getAssignmentsWithLockStatus(
  courseId: string,
  userId: string
): Promise<{ assignmentId: string; isLocked: boolean; prerequisiteModuleIds: string[] }[]> {
  const supabase = getClient()
  if (!supabase) return []

  // Get all assignments for the course
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('id')
    .eq('course_id', courseId)

  if (error || !assignments) return []

  const result: { assignmentId: string; isLocked: boolean; prerequisiteModuleIds: string[] }[] = []

  for (const assignment of assignments) {
    const prerequisiteModuleIds = await getAssignmentPrerequisites(assignment.id)
    const isUnlocked = await isAssignmentUnlocked(assignment.id, userId)
    result.push({
      assignmentId: assignment.id,
      isLocked: !isUnlocked,
      prerequisiteModuleIds
    })
  }

  return result
}

// ============================================
// DELETE MODULES AND ASSIGNMENTS
// ============================================

// Delete a module and all its lessons (cascades via FK)
export async function deleteModule(moduleId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', moduleId)

  if (error) {
    console.error('Error deleting module:', error)
    return false
  }

  return true
}

// Delete an assignment and all its submissions (cascades via FK)
export async function deleteAssignment(assignmentId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId)

  if (error) {
    console.error('Error deleting assignment:', error)
    return false
  }

  return true
}

// ============================================
// MODULE ASSIGNMENT PREREQUISITES
// ============================================
// These functions manage required assignments that must be completed
// before a module becomes accessible to students.

// Set required assignments for a module (replaces existing)
export async function setModuleRequiredAssignments(
  moduleId: string,
  assignmentIds: string[]
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  // First delete existing prerequisites for this module
  const { error: deleteError } = await supabase
    .from('module_assignment_prerequisites')
    .delete()
    .eq('module_id', moduleId)

  if (deleteError) {
    console.error('Error clearing module assignment prerequisites:', deleteError)
    return false
  }

  // If no assignments to add, we're done
  if (assignmentIds.length === 0) return true

  // Insert new prerequisites
  const records = assignmentIds.map(assignmentId => ({
    module_id: moduleId,
    assignment_id: assignmentId
  }))

  const { error: insertError } = await supabase
    .from('module_assignment_prerequisites')
    .insert(records)

  if (insertError) {
    console.error('Error setting module assignment prerequisites:', insertError)
    return false
  }

  return true
}

// Get required assignments for a module
export async function getModuleRequiredAssignments(moduleId: string): Promise<string[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('module_assignment_prerequisites')
    .select('assignment_id')
    .eq('module_id', moduleId)

  if (error || !data) return []
  return data.map(d => d.assignment_id)
}

// Check if an assignment is completed (submitted) by a user
// Note: Changed from 'graded' to 'submitted' - modules unlock immediately upon submission
export async function isAssignmentCompleted(assignmentId: string, userId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { data, error } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('assignment_id', assignmentId)
    .eq('student_id', userId)
    .in('status', ['submitted', 'graded']) // Accept both submitted and graded
    .single()

  if (error || !data) return false
  return true
}

// Check if a module is unlocked for a user (checks both module prerequisites AND required assignments)
export async function isModuleFullyUnlocked(moduleId: string, userId: string): Promise<{
  isUnlocked: boolean
  blockedByModule: boolean
  blockedByAssignments: boolean
  requiredAssignmentIds: string[]
  incompleteAssignmentIds: string[]
}> {
  const supabase = getClient()
  if (!supabase) return {
    isUnlocked: false,
    blockedByModule: false,
    blockedByAssignments: false,
    requiredAssignmentIds: [],
    incompleteAssignmentIds: []
  }

  // Check prerequisite module
  const isModuleUnlockedResult = await isModuleUnlocked(moduleId, userId)
  const blockedByModule = !isModuleUnlockedResult

  // Get required assignments
  const requiredAssignmentIds = await getModuleRequiredAssignments(moduleId)
  
  // Check which assignments are incomplete
  const incompleteAssignmentIds: string[] = []
  for (const assignmentId of requiredAssignmentIds) {
    const isComplete = await isAssignmentCompleted(assignmentId, userId)
    if (!isComplete) {
      incompleteAssignmentIds.push(assignmentId)
    }
  }

  const blockedByAssignments = incompleteAssignmentIds.length > 0

  return {
    isUnlocked: !blockedByModule && !blockedByAssignments,
    blockedByModule,
    blockedByAssignments,
    requiredAssignmentIds,
    incompleteAssignmentIds
  }
}

// Get modules with full lock status (including assignment requirements)
export async function getModulesWithFullLockStatus(
  courseId: string,
  userId: string
): Promise<Map<string, {
  isLocked: boolean
  blockedByModule: boolean
  blockedByAssignments: boolean
  prerequisiteModuleId: string | null
  requiredAssignmentIds: string[]
  incompleteAssignmentIds: string[]
}>> {
  const supabase = getClient()
  const result = new Map()
  if (!supabase) return result

  // Get all modules for the course
  const { data: modules, error } = await supabase
    .from('modules')
    .select('id, prerequisite_module_id')
    .eq('course_id', courseId)

  if (error || !modules) return result

  for (const mod of modules) {
    const lockStatus = await isModuleFullyUnlocked(mod.id, userId)
    result.set(mod.id, {
      isLocked: !lockStatus.isUnlocked,
      blockedByModule: lockStatus.blockedByModule,
      blockedByAssignments: lockStatus.blockedByAssignments,
      prerequisiteModuleId: mod.prerequisite_module_id,
      requiredAssignmentIds: lockStatus.requiredAssignmentIds,
      incompleteAssignmentIds: lockStatus.incompleteAssignmentIds
    })
  }

  return result
}

// ============================================
// ACTIVITY AUDIT LOGGING
// ============================================

export type ActivityType = 
  | 'lesson_started'
  | 'lesson_completed'
  | 'assignment_started'
  | 'assignment_submitted'
  | 'trade_log_submitted'
  | 'message_sent'
  | 'course_enrolled'
  | 'module_accessed'
  | 'terms_accepted'
  | 'login'
  | 'session_started'
  | 'session_ended'

/**
 * Log an activity to the audit log for engagement tracking and dispute evidence
 */
export async function logActivity(
  userId: string,
  courseId: string,
  activityType: ActivityType,
  description: string,
  options?: {
    lessonId?: string
    moduleId?: string
    assignmentId?: string
    ipAddress?: string
    userAgent?: string
    sessionDuration?: number
    metadata?: Record<string, unknown>
  }
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('activity_audit_log')
      .insert({
        user_id: userId,
        course_id: courseId,
        activity_type: activityType,
        activity_description: description,
        lesson_id: options?.lessonId || null,
        module_id: options?.moduleId || null,
        assignment_id: options?.assignmentId || null,
        ip_address: options?.ipAddress || null,
        user_agent: options?.userAgent || null,
        session_duration_seconds: options?.sessionDuration || null,
        metadata: options?.metadata || {}
      })

    if (error) {
      // Silently fail - don't break the main operation if audit logging fails
      // This might happen if the migration hasn't been run yet
      console.warn('Activity logging failed (table may not exist):', error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn('Activity logging error:', err)
    return false
  }
}

/**
 * Log terms acceptance for a course enrollment
 */
export async function logTermsAcceptance(
  userId: string,
  courseId: string,
  termsVersion: string = '1.0',
  options?: {
    ipAddress?: string
    userAgent?: string
    contentHash?: string
  }
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('terms_acceptance_log')
      .upsert({
        user_id: userId,
        course_id: courseId,
        terms_version: termsVersion,
        terms_content_hash: options?.contentHash || null,
        ip_address: options?.ipAddress || null,
        user_agent: options?.userAgent || null,
        accepted_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,course_id,terms_version'
      })

    if (error) {
      console.warn('Terms acceptance logging failed:', error.message)
      return false
    }

    // Also log as an activity
    await logActivity(userId, courseId, 'terms_accepted', `Accepted terms version ${termsVersion}`)

    return true
  } catch (err) {
    console.warn('Terms acceptance error:', err)
    return false
  }
}

/**
 * Get engagement metrics for a student in a course
 */
export async function getStudentEngagementMetrics(
  userId: string,
  courseId: string,
  days: number = 30
): Promise<{
  dailyScore: number
  weeklyScore: number
  isAtRisk: boolean
  daysInactive: number
  recentMetrics: Array<{
    date: string
    score: number
  }>
} | null> {
  const supabase = getClient()
  if (!supabase) return null

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('student_engagement_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .order('metric_date', { ascending: false })

  if (error || !data || data.length === 0) {
    return null
  }

  const latest = data[0]
  
  return {
    dailyScore: latest.daily_engagement_score,
    weeklyScore: latest.weekly_engagement_score,
    isAtRisk: latest.is_at_risk,
    daysInactive: latest.days_inactive,
    recentMetrics: data.map(m => ({
      date: m.metric_date,
      score: m.daily_engagement_score
    }))
  }
}

// ============================================
// QUIZ MANAGEMENT
// ============================================

import type {
  Quiz,
  QuizQuestion,
  QuizQuestionOption,
  QuizAttempt,
  QuizResponse,
  QuizWithQuestions,
  CreateQuizData,
  CreateQuestionData,
  CreateOptionData,
  SubmitResponseData,
  QuizStats
} from '@/lib/types/quiz'

export type { Quiz, QuizQuestion, QuizQuestionOption, QuizAttempt, QuizResponse, QuizWithQuestions, QuizStats }

/**
 * Get all quizzes for a course
 */
export async function getQuizzesByCourse(courseId: string): Promise<Quiz[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      modules:module_id (title)
    `)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching quizzes:', error)
    return []
  }

  return data.map(q => ({
    ...q,
    module_title: (q.modules as { title: string } | null)?.title || null
  }))
}

/**
 * Get a quiz by ID with questions and options
 */
export async function getQuizWithQuestions(quizId: string): Promise<QuizWithQuestions | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .single()

  if (quizError || !quiz) {
    console.error('Error fetching quiz:', quizError)
    return null
  }

  const { data: questions, error: questionsError } = await supabase
    .from('quiz_questions')
    .select(`
      *,
      options:quiz_question_options (*)
    `)
    .eq('quiz_id', quizId)
    .order('order', { ascending: true })

  if (questionsError) {
    console.error('Error fetching questions:', questionsError)
    return { ...quiz, questions: [] }
  }

  const questionsWithSortedOptions = questions.map(q => ({
    ...q,
    options: ((q.options as QuizQuestionOption[]) || []).sort((a, b) => a.order - b.order)
  }))

  return {
    ...quiz,
    questions: questionsWithSortedOptions
  }
}

/**
 * Create a new quiz
 */
export async function createQuiz(
  courseId: string,
  data: CreateQuizData
): Promise<Quiz | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .insert({
      course_id: courseId,
      title: data.title,
      description: data.description || null,
      time_limit_minutes: data.time_limit_minutes || null,
      points_possible: data.points_possible || 100,
      passing_score: data.passing_score || 70,
      max_attempts: data.max_attempts || 1,
      shuffle_questions: data.shuffle_questions || false,
      shuffle_options: data.shuffle_options || false,
      show_correct_answers: data.show_correct_answers ?? true,
      module_id: data.module_id || null,
      is_published: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating quiz:', error)
    throw new Error(`createQuiz failed: ${error.message}`)
  }

  return quiz
}

/**
 * Update a quiz
 */
export async function updateQuiz(
  quizId: string,
  data: Partial<CreateQuizData & { is_published?: boolean; is_restricted?: boolean }>
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('quizzes')
    .update(data)
    .eq('id', quizId)

  if (error) {
    console.error('Error updating quiz:', error)
    return false
  }

  return true
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(quizId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId)

  if (error) {
    console.error('Error deleting quiz:', error)
    return false
  }

  return true
}

/**
 * Create a quiz question
 */
export async function createQuizQuestion(
  quizId: string,
  data: CreateQuestionData
): Promise<QuizQuestion | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: existingQuestions } = await supabase
    .from('quiz_questions')
    .select('order')
    .eq('quiz_id', quizId)
    .order('order', { ascending: false })
    .limit(1)

  const nextOrder = existingQuestions && existingQuestions.length > 0 
    ? existingQuestions[0].order + 1 
    : 0

  const { data: question, error } = await supabase
    .from('quiz_questions')
    .insert({
      quiz_id: quizId,
      question_text: data.question_text,
      question_type: data.question_type,
      points: data.points || 10,
      order: data.order ?? nextOrder,
      correct_answer_text: data.correct_answer_text || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating question:', error)
    return null
  }

  if (data.options && data.options.length > 0) {
    const optionsToInsert = data.options.map((opt, idx) => ({
      question_id: question.id,
      option_text: opt.option_text,
      is_correct: opt.is_correct,
      order: opt.order ?? idx
    }))

    const { error: optionsError } = await supabase
      .from('quiz_question_options')
      .insert(optionsToInsert)

    if (optionsError) {
      console.error('Error creating options:', optionsError)
    }
  }

  return question
}

/**
 * Update a quiz question
 */
export async function updateQuizQuestion(
  questionId: string,
  data: Partial<CreateQuestionData>
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const updateData: Record<string, unknown> = {}
  if (data.question_text !== undefined) updateData.question_text = data.question_text
  if (data.question_type !== undefined) updateData.question_type = data.question_type
  if (data.points !== undefined) updateData.points = data.points
  if (data.order !== undefined) updateData.order = data.order
  if (data.correct_answer_text !== undefined) updateData.correct_answer_text = data.correct_answer_text

  const { error } = await supabase
    .from('quiz_questions')
    .update(updateData)
    .eq('id', questionId)

  if (error) {
    console.error('Error updating question:', error)
    return false
  }

  return true
}

/**
 * Delete a quiz question
 */
export async function deleteQuizQuestion(questionId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .eq('id', questionId)

  if (error) {
    console.error('Error deleting question:', error)
    return false
  }

  return true
}

/**
 * Create a question option
 */
export async function createQuestionOption(
  questionId: string,
  data: CreateOptionData
): Promise<QuizQuestionOption | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: existingOptions } = await supabase
    .from('quiz_question_options')
    .select('order')
    .eq('question_id', questionId)
    .order('order', { ascending: false })
    .limit(1)

  const nextOrder = existingOptions && existingOptions.length > 0 
    ? existingOptions[0].order + 1 
    : 0

  const { data: option, error } = await supabase
    .from('quiz_question_options')
    .insert({
      question_id: questionId,
      option_text: data.option_text,
      is_correct: data.is_correct,
      order: data.order ?? nextOrder
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating option:', error)
    return null
  }

  return option
}

/**
 * Update a question option
 */
export async function updateQuestionOption(
  optionId: string,
  data: Partial<CreateOptionData>
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('quiz_question_options')
    .update(data)
    .eq('id', optionId)

  if (error) {
    console.error('Error updating option:', error)
    return false
  }

  return true
}

/**
 * Delete a question option
 */
export async function deleteQuestionOption(optionId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('quiz_question_options')
    .delete()
    .eq('id', optionId)

  if (error) {
    console.error('Error deleting option:', error)
    return false
  }

  return true
}

// ============================================
// QUIZ ATTEMPTS
// ============================================

/**
 * Start a quiz attempt
 * If an in-progress attempt already exists, returns that instead of creating a new one
 */
export async function startQuizAttempt(
  quizId: string,
  studentId: string
): Promise<QuizAttempt | null> {
  const supabase = getClient()
  if (!supabase) return null

  // First, check for existing in-progress attempt
  const { data: existingAttempt, error: existingError } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('student_id', studentId)
    .eq('status', 'in_progress')
    .single()

  // If an in-progress attempt exists, return it (resume)
  if (existingAttempt && !existingError) {
    console.log('[DEBUG:START_ATTEMPT:RESUMING]', JSON.stringify({ attemptId: existingAttempt.id }))
    return existingAttempt
  }

  // Check if student can attempt (max attempts not exceeded)
  const { data: canAttempt } = await supabase.rpc('can_attempt_quiz', {
    p_quiz_id: quizId,
    p_student_id: studentId
  })

  if (!canAttempt) {
    throw new Error('Maximum attempts reached for this quiz')
  }

  const { count } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('student_id', studentId)

  const attemptNumber = (count || 0) + 1

  const { data: attempt, error } = await supabase
    .from('quiz_attempts')
    .insert({
      quiz_id: quizId,
      student_id: studentId,
      attempt_number: attemptNumber,
      status: 'in_progress'
    })
    .select()
    .single()

  if (error) {
    console.error('Error starting attempt:', error)
    throw new Error(`Failed to start quiz attempt: ${error.message}`)
  }

  console.log('[DEBUG:START_ATTEMPT:NEW]', JSON.stringify({ attemptId: attempt.id }))
  return attempt
}

/**
 * Get an attempt by ID
 */
export async function getQuizAttempt(attemptId: string): Promise<QuizAttempt | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      responses:quiz_responses (
        *,
        question:quiz_questions (*),
        selected_option:quiz_question_options (*)
      )
    `)
    .eq('id', attemptId)
    .single()

  if (error) {
    console.error('Error fetching attempt:', error)
    return null
  }

  return data
}

/**
 * Save a response during quiz taking
 */
export async function saveQuizResponse(
  attemptId: string,
  questionId: string,
  response: SubmitResponseData
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  console.log('[DEBUG:SAVE_RESPONSE]', JSON.stringify({attemptId,questionId,hasOptionId:!!response.selected_option_id,hasText:!!response.text_response}));

  const { error } = await supabase
    .from('quiz_responses')
    .upsert({
      attempt_id: attemptId,
      question_id: questionId,
      selected_option_id: response.selected_option_id || null,
      text_response: response.text_response || null
    }, {
      onConflict: 'attempt_id,question_id'
    })

  if (error) {
    console.log('[DEBUG:SAVE_RESPONSE:ERROR]', JSON.stringify({error:error.message,code:error.code}));
    console.error('Error saving response:', error)
    return false
  }

  return true
}

/**
 * Submit a quiz attempt (finalizes and grades)
 */
export async function submitQuizAttempt(attemptId: string): Promise<QuizAttempt | null> {
  const supabase = getClient()
  if (!supabase) return null

  console.log('[DEBUG:SUBMIT_ATTEMPT:START]', JSON.stringify({attemptId}));

  const { data: attempt, error: attemptError } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      quiz:quizzes (*)
    `)
    .eq('id', attemptId)
    .single()

  if (attemptError || !attempt) {
    console.log('[DEBUG:SUBMIT_ATTEMPT:FETCH_ERROR]', JSON.stringify({error:attemptError?.message,attemptId}));
    console.error('Error fetching attempt:', attemptError)
    return null
  }

  console.log('[DEBUG:SUBMIT_ATTEMPT:STATUS]', JSON.stringify({attemptId,status:attempt.status,quizId:attempt.quiz_id}));

  const { data: responses, error: responsesError } = await supabase
    .from('quiz_responses')
    .select(`
      *,
      question:quiz_questions (*),
      selected_option:quiz_question_options (*)
    `)
    .eq('attempt_id', attemptId)

  if (responsesError) {
    console.log('[DEBUG:SUBMIT_ATTEMPT:RESPONSES_ERROR]', JSON.stringify({error:responsesError.message}));
    console.error('Error fetching responses:', responsesError)
    return null
  }

  console.log('[DEBUG:SUBMIT_ATTEMPT:RESPONSES]', JSON.stringify({responseCount:responses?.length||0}));
  // #endregion

  let totalEarned = 0
  for (const resp of responses || []) {
    const question = resp.question as QuizQuestion
    let isCorrect = false
    let pointsEarned = 0

    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
      const selectedOption = resp.selected_option as QuizQuestionOption | null
      isCorrect = selectedOption?.is_correct || false
      pointsEarned = isCorrect ? question.points : 0
    } else if (question.question_type === 'short_answer') {
      isCorrect = false
      pointsEarned = 0
    }

    totalEarned += pointsEarned

    await supabase
      .from('quiz_responses')
      .update({
        is_correct: isCorrect,
        points_earned: pointsEarned
      })
      .eq('id', resp.id)
  }

  const startedAt = new Date(attempt.started_at)
  const submittedAt = new Date()
  const timeSpentSeconds = Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000)

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('points')
    .eq('quiz_id', attempt.quiz_id)

  const totalPossible = questions?.reduce((sum, q) => sum + q.points, 0) || 0
  const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0

  const hasShortAnswer = responses?.some(r => (r.question as QuizQuestion).question_type === 'short_answer')
  const status = hasShortAnswer ? 'submitted' : 'graded'

  const { data: updatedAttempt, error: updateError } = await supabase
    .from('quiz_attempts')
    .update({
      submitted_at: submittedAt.toISOString(),
      score: totalEarned,
      score_percentage: percentage,
      time_spent_seconds: timeSpentSeconds,
      status
    })
    .eq('id', attemptId)
    .select()
    .single()

  if (updateError) {
    console.log('[DEBUG:SUBMIT_ATTEMPT:UPDATE_ERROR]', JSON.stringify({error:updateError.message,code:updateError.code}));
    console.error('Error updating attempt:', updateError)
    return null
  }

  console.log('[DEBUG:SUBMIT_ATTEMPT:SUCCESS]', JSON.stringify({attemptId,score:totalEarned,percentage,status}));

  return updatedAttempt
}

/**
 * Get all attempts for a quiz (instructor view)
 */
export async function getQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      student:user_profiles!quiz_attempts_student_id_fkey (
        full_name
      )
    `)
    .eq('quiz_id', quizId)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching attempts:', error)
    return []
  }

  return data.map(a => ({
    ...a,
    student_name: (a.student as { full_name: string } | null)?.full_name || 'Student'
  }))
}

/**
 * Get student's attempts for a quiz
 */
export async function getStudentQuizAttempts(
  quizId: string,
  studentId: string
): Promise<QuizAttempt[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('student_id', studentId)
    .order('attempt_number', { ascending: false })

  if (error) {
    console.error('Error fetching student attempts:', error)
    return []
  }

  return data
}

/**
 * Grade a short answer response (instructor)
 */
export async function gradeShortAnswerResponse(
  responseId: string,
  isCorrect: boolean,
  pointsEarned: number,
  feedback: string | null,
  graderId: string
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('quiz_responses')
    .update({
      is_correct: isCorrect,
      points_earned: pointsEarned,
      instructor_feedback: feedback,
      graded_by: graderId,
      graded_at: new Date().toISOString()
    })
    .eq('id', responseId)

  if (error) {
    console.error('Error grading response:', error)
    return false
  }

  const { data: response } = await supabase
    .from('quiz_responses')
    .select('attempt_id')
    .eq('id', responseId)
    .single()

  if (response) {
    await recalculateAttemptScore(response.attempt_id)
  }

  return true
}

/**
 * Recalculate attempt score after grading
 */
async function recalculateAttemptScore(attemptId: string): Promise<void> {
  const supabase = getClient()
  if (!supabase) return

  const { data: responses } = await supabase
    .from('quiz_responses')
    .select('points_earned, is_correct')
    .eq('attempt_id', attemptId)

  if (!responses) return

  const totalEarned = responses.reduce((sum, r) => sum + (r.points_earned || 0), 0)

  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select('quiz_id')
    .eq('id', attemptId)
    .single()

  if (!attempt) return

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('points')
    .eq('quiz_id', attempt.quiz_id)

  const totalPossible = questions?.reduce((sum, q) => sum + q.points, 0) || 0
  const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0

  const allGraded = responses.every(r => r.is_correct !== null)

  await supabase
    .from('quiz_attempts')
    .update({
      score: totalEarned,
      score_percentage: percentage,
      status: allGraded ? 'graded' : 'submitted'
    })
    .eq('id', attemptId)
}

/**
 * Get quiz statistics
 */
export async function getQuizStats(quizId: string): Promise<QuizStats | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select('score_percentage, time_spent_seconds')
    .eq('quiz_id', quizId)
    .in('status', ['submitted', 'graded'])

  if (error || !attempts || attempts.length === 0) {
    return null
  }

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('passing_score')
    .eq('id', quizId)
    .single()

  const passingScore = quiz?.passing_score || 70
  const scores = attempts.map(a => a.score_percentage || 0)
  const times = attempts.map(a => a.time_spent_seconds || 0).filter(t => t > 0)

  return {
    total_attempts: attempts.length,
    average_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    highest_score: Math.max(...scores),
    lowest_score: Math.min(...scores),
    pass_rate: Math.round((scores.filter(s => s >= passingScore).length / scores.length) * 100),
    average_time_seconds: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  }
}

// ============================================
// QUIZ TARGETING (Per-Student Assignments)
// ============================================

/**
 * Get quiz targets (assigned student IDs)
 */
export async function getQuizTargets(quizId: string): Promise<string[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('quiz_targets')
    .select('user_id')
    .eq('quiz_id', quizId)

  if (error) {
    console.error('Error fetching quiz targets:', error)
    return []
  }

  return data.map(t => t.user_id)
}

/**
 * Assign a quiz to a student
 */
export async function assignQuizToStudent(quizId: string, userId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('quiz_targets')
    .upsert({ quiz_id: quizId, user_id: userId }, { onConflict: 'quiz_id,user_id' })

  if (error) {
    console.error('Error assigning quiz to student:', error)
    return false
  }

  return true
}

/**
 * Remove quiz assignment from a student
 */
export async function unassignQuizFromStudent(quizId: string, userId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('quiz_targets')
    .delete()
    .eq('quiz_id', quizId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error unassigning quiz from student:', error)
    return false
  }

  return true
}

/**
 * Get quizzes visible to a student (filtering by is_restricted and targeting)
 */
export async function getStudentVisibleQuizzes(
  courseId: string,
  studentId: string
): Promise<Quiz[]> {
  const supabase = getClient()
  if (!supabase) return []

  // Get all published quizzes for the course
  const { data: allQuizzes, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error || !allQuizzes) {
    console.error('Error fetching quizzes:', error)
    return []
  }

  // Get quiz targets for restricted quizzes
  const restrictedIds = allQuizzes.filter(q => q.is_restricted).map(q => q.id)
  
  if (restrictedIds.length === 0) {
    return allQuizzes
  }

  const { data: targets } = await supabase
    .from('quiz_targets')
    .select('quiz_id')
    .eq('user_id', studentId)
    .in('quiz_id', restrictedIds)

  const assignedRestrictedIds = new Set(targets?.map(t => t.quiz_id) || [])

  // Filter: include unrestricted OR student is assigned
  return allQuizzes.filter(q => 
    !q.is_restricted || assignedRestrictedIds.has(q.id)
  )
}

// ============================================
// QUIZ PREREQUISITES (Module-Based)
// ============================================

/**
 * Set module prerequisites for a quiz
 */
export async function setQuizModulePrerequisites(quizId: string, moduleIds: string[]): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  // First, delete existing module prerequisites
  const { error: deleteError } = await supabase
    .from('quiz_module_prerequisites')
    .delete()
    .eq('quiz_id', quizId)

  if (deleteError) {
    console.error('Error deleting quiz module prerequisites:', deleteError)
    return false
  }

  // If no modules, we're done
  if (moduleIds.length === 0) return true

  // Insert new prerequisites
  const insertData = moduleIds.map(moduleId => ({
    quiz_id: quizId,
    module_id: moduleId
  }))

  const { error: insertError } = await supabase
    .from('quiz_module_prerequisites')
    .insert(insertData)

  if (insertError) {
    console.error('Error setting quiz module prerequisites:', insertError)
    return false
  }

  return true
}

/**
 * Get module prerequisites for a quiz
 */
export async function getQuizModulePrerequisites(quizId: string): Promise<string[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('quiz_module_prerequisites')
    .select('module_id')
    .eq('quiz_id', quizId)

  if (error || !data) return []
  return data.map(d => d.module_id)
}

// ============================================
// QUIZ PREREQUISITES (Assignment-Based)
// ============================================

/**
 * Set assignment prerequisites for a quiz
 */
export async function setQuizAssignmentPrerequisites(quizId: string, assignmentIds: string[]): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  // First, delete existing assignment prerequisites
  const { error: deleteError } = await supabase
    .from('quiz_assignment_prerequisites')
    .delete()
    .eq('quiz_id', quizId)

  if (deleteError) {
    console.error('Error deleting quiz assignment prerequisites:', deleteError)
    return false
  }

  // If no assignments, we're done
  if (assignmentIds.length === 0) return true

  // Insert new prerequisites
  const insertData = assignmentIds.map(assignmentId => ({
    quiz_id: quizId,
    assignment_id: assignmentId
  }))

  const { error: insertError } = await supabase
    .from('quiz_assignment_prerequisites')
    .insert(insertData)

  if (insertError) {
    console.error('Error setting quiz assignment prerequisites:', insertError)
    return false
  }

  return true
}

/**
 * Get assignment prerequisites for a quiz
 */
export async function getQuizAssignmentPrerequisites(quizId: string): Promise<string[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('quiz_assignment_prerequisites')
    .select('assignment_id')
    .eq('quiz_id', quizId)

  if (error || !data) return []
  return data.map(d => d.assignment_id)
}

/**
 * Check if a quiz is unlocked for a user (all prerequisites met)
 */
export async function isQuizUnlockedForUser(quizId: string, userId: string): Promise<{
  isUnlocked: boolean
  incompleteModuleIds: string[]
  incompleteAssignmentIds: string[]
}> {
  const supabase = getClient()
  if (!supabase) return {
    isUnlocked: false,
    incompleteModuleIds: [],
    incompleteAssignmentIds: []
  }

  // Get module prerequisites
  const modulePrereqs = await getQuizModulePrerequisites(quizId)
  const incompleteModuleIds: string[] = []
  
  for (const moduleId of modulePrereqs) {
    const isComplete = await isModuleComplete(moduleId, userId)
    if (!isComplete) {
      incompleteModuleIds.push(moduleId)
    }
  }

  // Get assignment prerequisites
  const assignmentPrereqs = await getQuizAssignmentPrerequisites(quizId)
  const incompleteAssignmentIds: string[] = []
  
  for (const assignmentId of assignmentPrereqs) {
    const isComplete = await isAssignmentCompleted(assignmentId, userId)
    if (!isComplete) {
      incompleteAssignmentIds.push(assignmentId)
    }
  }

  return {
    isUnlocked: incompleteModuleIds.length === 0 && incompleteAssignmentIds.length === 0,
    incompleteModuleIds,
    incompleteAssignmentIds
  }
}

/**
 * Get quizzes with their lock status for a student
 */
export async function getQuizzesWithLockStatus(
  courseId: string,
  userId: string
): Promise<Map<string, {
  isLocked: boolean
  incompleteModuleIds: string[]
  incompleteAssignmentIds: string[]
}>> {
  const supabase = getClient()
  const result = new Map()
  if (!supabase) return result

  // Get all quizzes for the course
  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select('id')
    .eq('course_id', courseId)

  if (error || !quizzes) return result

  for (const quiz of quizzes) {
    const lockStatus = await isQuizUnlockedForUser(quiz.id, userId)
    result.set(quiz.id, {
      isLocked: !lockStatus.isUnlocked,
      incompleteModuleIds: lockStatus.incompleteModuleIds,
      incompleteAssignmentIds: lockStatus.incompleteAssignmentIds
    })
  }

  return result
}

