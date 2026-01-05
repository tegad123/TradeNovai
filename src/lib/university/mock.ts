// University Mode Mock Data

import {
  Course,
  Module,
  Assignment,
  Submission,
  MessageThread,
  Message,
  TradeLog,
  StudentProgress,
  UniversityUser,
} from './types'

// Mock Users
export const mockInstructor: UniversityUser = {
  id: 'instructor-1',
  name: 'Alex Thompson',
  email: 'alex@tradingacademy.com',
  avatarUrl: undefined,
  role: 'instructor',
}

export const mockStudent: UniversityUser = {
  id: 'student-1',
  name: 'Jordan Lee',
  email: 'jordan@student.com',
  avatarUrl: undefined,
  role: 'student',
}

// Mock Courses
export const mockCourses: Course[] = [
  {
    id: 'course-1',
    name: 'Futures Trading Fundamentals',
    code: 'FTF-101',
    description: 'Master the basics of futures trading, including ES, NQ, and CL contracts. Learn entry/exit strategies, risk management, and market analysis.',
    instructorId: 'instructor-1',
    instructorName: 'Alex Thompson',
    coverImageUrl: undefined,
    enrolledCount: 24,
    accessCode: 'FTF2024',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'course-2',
    name: 'Advanced Price Action',
    code: 'APA-201',
    description: 'Deep dive into price action trading, candlestick patterns, support/resistance, and market structure analysis.',
    instructorId: 'instructor-1',
    instructorName: 'Alex Thompson',
    coverImageUrl: undefined,
    enrolledCount: 18,
    accessCode: 'APA2024',
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'course-3',
    name: 'Trading Psychology Mastery',
    code: 'TPM-301',
    description: 'Develop the mental edge needed for consistent trading. Learn to manage emotions, build discipline, and maintain focus.',
    instructorId: 'instructor-2',
    instructorName: 'Sarah Chen',
    coverImageUrl: undefined,
    enrolledCount: 32,
    accessCode: 'TPM2024',
    createdAt: '2024-01-20T10:00:00Z',
  },
]

// Mock Modules for course-1
export const mockModules: Module[] = [
  {
    id: 'module-1',
    courseId: 'course-1',
    title: 'Introduction to Futures Markets',
    description: 'Understanding the futures market structure, contract specifications, and trading sessions.',
    order: 1,
    isPublished: true,
    lessons: [
      {
        id: 'lesson-1-1',
        moduleId: 'module-1',
        title: 'What Are Futures Contracts?',
        content: 'Futures contracts are standardized agreements to buy or sell an asset at a predetermined price at a specified time in the future...',
        order: 1,
        duration: 15,
        isCompleted: true,
      },
      {
        id: 'lesson-1-2',
        moduleId: 'module-1',
        title: 'Popular Futures Contracts (ES, NQ, CL)',
        content: 'The most actively traded futures contracts include the E-mini S&P 500 (ES), E-mini NASDAQ (NQ), and Crude Oil (CL)...',
        order: 2,
        duration: 20,
        isCompleted: true,
      },
      {
        id: 'lesson-1-3',
        moduleId: 'module-1',
        title: 'Market Hours and Sessions',
        content: 'Understanding the different trading sessions: Asian, European, and US sessions...',
        order: 3,
        duration: 12,
        isCompleted: false,
      },
    ],
  },
  {
    id: 'module-2',
    courseId: 'course-1',
    title: 'Technical Analysis Basics',
    description: 'Learn the foundational concepts of technical analysis for futures trading.',
    order: 2,
    isPublished: true,
    lessons: [
      {
        id: 'lesson-2-1',
        moduleId: 'module-2',
        title: 'Support and Resistance Levels',
        content: 'Support and resistance are key concepts in technical analysis...',
        order: 1,
        duration: 25,
        isCompleted: false,
      },
      {
        id: 'lesson-2-2',
        moduleId: 'module-2',
        title: 'Trend Lines and Channels',
        content: 'Drawing and using trend lines to identify market direction...',
        order: 2,
        duration: 18,
        isCompleted: false,
      },
    ],
  },
  {
    id: 'module-3',
    courseId: 'course-1',
    title: 'Risk Management',
    description: 'Essential risk management techniques for futures traders.',
    order: 3,
    isPublished: true,
    lessons: [
      {
        id: 'lesson-3-1',
        moduleId: 'module-3',
        title: 'Position Sizing',
        content: 'How to calculate proper position sizes based on account size and risk tolerance...',
        order: 1,
        duration: 22,
        isCompleted: false,
      },
      {
        id: 'lesson-3-2',
        moduleId: 'module-3',
        title: 'Stop Loss Strategies',
        content: 'Different types of stop losses and when to use each...',
        order: 2,
        duration: 20,
        isCompleted: false,
      },
    ],
  },
]

// Mock Assignments
export const mockAssignments: Assignment[] = [
  {
    id: 'assignment-1',
    courseId: 'course-1',
    title: 'Weekly Trade Reflection',
    description: 'Submit a detailed reflection on your trading week. Include at least 3 trades with entry/exit reasoning, what went well, and areas for improvement.',
    dueDate: '2024-12-20T23:59:00Z',
    points: 100,
    type: 'reflection',
    isPublished: true,
    createdAt: '2024-12-01T10:00:00Z',
  },
  {
    id: 'assignment-2',
    courseId: 'course-1',
    title: 'Support/Resistance Analysis',
    description: 'Identify and annotate key support and resistance levels on the ES daily chart. Explain your methodology.',
    dueDate: '2024-12-18T23:59:00Z',
    points: 50,
    type: 'trade_analysis',
    isPublished: true,
    createdAt: '2024-12-05T10:00:00Z',
  },
  {
    id: 'assignment-3',
    courseId: 'course-1',
    title: 'Risk Management Quiz',
    description: 'Complete this quiz to test your understanding of position sizing and risk management concepts.',
    dueDate: '2024-12-25T23:59:00Z',
    points: 25,
    type: 'quiz',
    isPublished: true,
    createdAt: '2024-12-10T10:00:00Z',
  },
]

// Mock Submissions
export const mockSubmissions: Submission[] = [
  {
    id: 'submission-1',
    assignmentId: 'assignment-1',
    studentId: 'student-1',
    studentName: 'Jordan Lee',
    content: 'This week I focused on ES scalping during the US open. My best trade was a long entry at 4520 support with a target of 4528. I noticed I tend to exit winners too early...',
    submittedAt: '2024-12-15T14:30:00Z',
    status: 'submitted',
  },
  {
    id: 'submission-2',
    assignmentId: 'assignment-2',
    studentId: 'student-2',
    studentName: 'Casey Morgan',
    content: 'I identified the following key levels on ES: 4500 (major support), 4520 (minor support), 4550 (resistance)...',
    submittedAt: '2024-12-14T16:00:00Z',
    grade: 45,
    feedback: 'Great analysis! Consider also marking the weekly levels for additional context.',
    gradedAt: '2024-12-16T10:00:00Z',
    status: 'graded',
  },
  {
    id: 'submission-3',
    assignmentId: 'assignment-1',
    studentId: 'student-3',
    studentName: 'Riley Johnson',
    content: 'My trading week was challenging. I took 5 trades with 2 winners and 3 losers...',
    submittedAt: '2024-12-16T09:00:00Z',
    status: 'pending',
  },
]

// Mock Message Threads
export const mockThreads: MessageThread[] = [
  {
    id: 'thread-1',
    courseId: 'course-1',
    subject: 'Question about position sizing',
    participants: ['student-1', 'instructor-1'],
    participantNames: ['Jordan Lee', 'Alex Thompson'],
    createdAt: '2024-12-10T10:00:00Z',
    updatedAt: '2024-12-12T14:30:00Z',
  },
  {
    id: 'thread-2',
    courseId: 'course-1',
    subject: 'Feedback on my trade setup',
    participants: ['student-2', 'instructor-1'],
    participantNames: ['Casey Morgan', 'Alex Thompson'],
    createdAt: '2024-12-08T15:00:00Z',
    updatedAt: '2024-12-11T09:00:00Z',
  },
  {
    id: 'thread-3',
    courseId: 'course-1',
    subject: 'Class announcement: Live session Friday',
    participants: ['instructor-1'],
    participantNames: ['Alex Thompson'],
    createdAt: '2024-12-14T08:00:00Z',
    updatedAt: '2024-12-14T08:00:00Z',
  },
]

// Mock Messages
export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    threadId: 'thread-1',
    senderId: 'student-1',
    senderName: 'Jordan Lee',
    senderRole: 'student',
    content: 'Hi Alex, I\'m confused about how to calculate position size when trading micro contracts. Can you help?',
    createdAt: '2024-12-10T10:00:00Z',
    isRead: true,
  },
  {
    id: 'msg-2',
    threadId: 'thread-1',
    senderId: 'instructor-1',
    senderName: 'Alex Thompson',
    senderRole: 'instructor',
    content: 'Great question Jordan! For micro contracts, the tick value is $1.25 for MES. So if you want to risk $50 per trade with a 10-tick stop, you can trade 4 contracts.',
    createdAt: '2024-12-10T14:00:00Z',
    isRead: true,
  },
  {
    id: 'msg-3',
    threadId: 'thread-1',
    senderId: 'student-1',
    senderName: 'Jordan Lee',
    senderRole: 'student',
    content: 'That makes sense! So it\'s: (Risk Amount) / (Stop in ticks × Tick Value) = Number of contracts. Thank you!',
    createdAt: '2024-12-12T14:30:00Z',
    isRead: false,
  },
]

// Mock Trade Logs
export const mockTradeLogs: TradeLog[] = [
  {
    id: 'log-1',
    courseId: 'course-1',
    studentId: 'student-1',
    studentName: 'Jordan Lee',
    tradeDate: '2024-12-15',
    symbol: 'MES',
    side: 'long',
    entryPrice: 4520.25,
    exitPrice: 4528.50,
    pnl: 41.25,
    reflection: 'Good entry at support. Held for full target. Need to work on patience during consolidation.',
    submittedAt: '2024-12-15T16:00:00Z',
  },
  {
    id: 'log-2',
    courseId: 'course-1',
    studentId: 'student-1',
    studentName: 'Jordan Lee',
    tradeDate: '2024-12-14',
    symbol: 'MNQ',
    side: 'short',
    entryPrice: 15820.00,
    exitPrice: 15785.50,
    pnl: 69.00,
    reflection: 'Shorted resistance after failed breakout. Clean setup, good execution.',
    submittedAt: '2024-12-14T17:30:00Z',
    instructorFeedback: 'Excellent read on the failed breakout! This is exactly the type of confirmation we discussed.',
    feedbackAt: '2024-12-15T09:00:00Z',
  },
]

// Mock Student Progress (for instructor view)
export const mockStudentProgress: StudentProgress[] = [
  {
    userId: 'student-1',
    userName: 'Jordan Lee',
    courseId: 'course-1',
    lessonsCompleted: 2,
    totalLessons: 7,
    assignmentsCompleted: 1,
    totalAssignments: 3,
    averageGrade: 88,
    tradeLogsSubmitted: 12,
    lastActive: '2024-12-16T10:00:00Z',
  },
  {
    userId: 'student-2',
    userName: 'Casey Morgan',
    courseId: 'course-1',
    lessonsCompleted: 5,
    totalLessons: 7,
    assignmentsCompleted: 2,
    totalAssignments: 3,
    averageGrade: 92,
    tradeLogsSubmitted: 8,
    lastActive: '2024-12-15T14:00:00Z',
  },
  {
    userId: 'student-3',
    userName: 'Riley Johnson',
    courseId: 'course-1',
    lessonsCompleted: 3,
    totalLessons: 7,
    assignmentsCompleted: 1,
    totalAssignments: 3,
    averageGrade: 78,
    tradeLogsSubmitted: 5,
    lastActive: '2024-12-16T09:00:00Z',
  },
  {
    userId: 'student-4',
    userName: 'Taylor Smith',
    courseId: 'course-1',
    lessonsCompleted: 7,
    totalLessons: 7,
    assignmentsCompleted: 3,
    totalAssignments: 3,
    averageGrade: 95,
    tradeLogsSubmitted: 20,
    lastActive: '2024-12-16T11:00:00Z',
  },
]

// Helper functions
export function getModulesByCourse(courseId: string): Module[] {
  return mockModules.filter(m => m.courseId === courseId)
}

export function getAssignmentsByCourse(courseId: string): Assignment[] {
  return mockAssignments.filter(a => a.courseId === courseId)
}

export function getThreadsByCourse(courseId: string): MessageThread[] {
  return mockThreads.filter(t => t.courseId === courseId)
}

export function getMessagesByThread(threadId: string): Message[] {
  return mockMessages.filter(m => m.threadId === threadId)
}

export function getTradeLogsByCourse(courseId: string): TradeLog[] {
  return mockTradeLogs.filter(l => l.courseId === courseId)
}

export function getStudentProgressByCourse(courseId: string): StudentProgress[] {
  return mockStudentProgress.filter(p => p.courseId === courseId)
}

export function getCourseByAccessCode(code: string): Course | undefined {
  return mockCourses.find(c => c.accessCode.toLowerCase() === code.toLowerCase())
}

