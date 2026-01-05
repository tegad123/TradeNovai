// University Mode Types

export type UserRole = 'student' | 'instructor'

export interface UniversityUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: UserRole
}

export interface Course {
  id: string
  name: string
  code: string
  description: string
  instructorId: string
  instructorName: string
  coverImageUrl?: string
  enrolledCount: number
  accessCode: string
  createdAt: string
}

export interface CourseEnrollment {
  id: string
  userId: string
  courseId: string
  role: UserRole
  enrolledAt: string
}

export interface Module {
  id: string
  courseId: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
  isPublished: boolean
}

export interface Lesson {
  id: string
  moduleId: string
  title: string
  content: string
  videoUrl?: string
  order: number
  duration?: number // minutes
  isCompleted?: boolean
}

export interface Assignment {
  id: string
  courseId: string
  title: string
  description: string
  dueDate: string
  points: number
  type: 'reflection' | 'trade_analysis' | 'quiz' | 'journal'
  isPublished: boolean
  createdAt: string
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  content: string
  attachments?: string[]
  submittedAt: string
  grade?: number
  feedback?: string
  gradedAt?: string
  status: 'pending' | 'submitted' | 'graded' | 'returned'
}

export interface Message {
  id: string
  threadId: string
  senderId: string
  senderName: string
  senderRole: UserRole
  content: string
  createdAt: string
  isRead: boolean
}

export interface MessageThread {
  id: string
  courseId: string
  subject: string
  participants: string[]
  participantNames: string[]
  lastMessage?: Message
  createdAt: string
  updatedAt: string
}

export interface TradeLog {
  id: string
  courseId: string
  studentId: string
  studentName: string
  tradeDate: string
  symbol: string
  side: 'long' | 'short'
  entryPrice: number
  exitPrice: number
  pnl: number
  reflection: string
  screenshot_url?: string
  screenshot_urls?: string[]
  screenshots?: string[]
  submittedAt: string
  feedback?: string
  instructorFeedback?: string
  feedbackAt?: string
  trade_date?: string  // Alias from DB
}

export interface StudentProgress {
  userId: string
  userName: string
  avatarUrl?: string
  courseId: string
  lessonsCompleted: number
  totalLessons: number
  assignmentsCompleted: number
  totalAssignments: number
  averageGrade: number
  tradeLogsSubmitted: number
  lastActive: string
}

// Context Types
export interface UniversityContextType {
  mode: 'journal' | 'university'
  setMode: (mode: 'journal' | 'university') => void
  currentUser: UniversityUser | null
  currentRole: UserRole
  setCurrentRole: (role: UserRole) => void
  courses: Course[]
  currentCourse: Course | null
  setCurrentCourse: (course: Course | null) => void
  joinCourse: (accessCode: string) => Promise<boolean>
  isLoading: boolean
}

