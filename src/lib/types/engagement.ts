// Engagement Tracking Types

export type StudentEngagementMetric = {
  id: string
  user_id: string
  course_id: string
  metric_date: string
  lessons_completed_today: number
  assignments_submitted_today: number
  trade_logs_submitted_today: number
  messages_sent_today: number
  daily_engagement_score: number
  weekly_engagement_score: number
  is_at_risk: boolean
  days_inactive: number
  created_at: string
  updated_at: string
  // Joined data
  user_name?: string
  avatar_url?: string
}

export type ActivityAuditLog = {
  id: string
  user_id: string
  course_id: string
  activity_type: ActivityType
  activity_description: string
  lesson_id?: string
  module_id?: string
  assignment_id?: string
  ip_address?: string
  user_agent?: string
  session_duration_seconds?: number
  metadata?: Record<string, unknown>
  created_at: string
}

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

export type DisputeEvidenceDocument = {
  id: string
  user_id: string
  course_id: string
  generated_by: string
  file_name: string
  file_url: string
  file_size_bytes: number
  evidence_summary: EvidenceSummary
  dispute_reason?: string
  dispute_amount?: number
  generated_at: string
  accessed_at?: string
  created_at: string
  updated_at: string
}

export type EvidenceSummary = {
  totalLogins: number
  completedLessons: number
  totalLessons: number
  completionPercentage: number
  totalAssignments: number
  totalTradeLogs: number
  totalMessages: number
  avgEngagementScore: string
  daysSinceLastActive: number
  totalTimeSpent: string
  enrollmentDate: string
  lastActiveDate: string
}

export type TermsAcceptanceLog = {
  id: string
  user_id: string
  course_id: string
  terms_version: string
  terms_content_hash?: string
  ip_address?: string
  user_agent?: string
  accepted_at: string
}

export type EngagementStatus = 'active' | 'at-risk' | 'disengaged'

export function getEngagementStatus(score: number, daysInactive: number): EngagementStatus {
  if (daysInactive > 14 || score < 20) return 'disengaged'
  if (daysInactive > 7 || score < 40) return 'at-risk'
  return 'active'
}

export function getEngagementColor(status: EngagementStatus): string {
  switch (status) {
    case 'active': return 'text-green-400'
    case 'at-risk': return 'text-yellow-400'
    case 'disengaged': return 'text-red-400'
  }
}

export function getEngagementBgColor(status: EngagementStatus): string {
  switch (status) {
    case 'active': return 'bg-green-500/20'
    case 'at-risk': return 'bg-yellow-500/20'
    case 'disengaged': return 'bg-red-500/20'
  }
}

export function getEngagementBadge(status: EngagementStatus): string {
  switch (status) {
    case 'active': return 'Active'
    case 'at-risk': return 'At Risk'
    case 'disengaged': return 'Disengaged'
  }
}

export function getEngagementIcon(status: EngagementStatus): '🟢' | '🟡' | '🔴' {
  switch (status) {
    case 'active': return '🟢'
    case 'at-risk': return '🟡'
    case 'disengaged': return '🔴'
  }
}

// Engagement data for analytics display
export type EngagementAnalyticsData = {
  totalActive: number
  averageScore: number
  atRiskCount: number
  topStudent: { name: string; score: number } | null
  chartData: Array<{ date: string; score: number }>
}

// Student with engagement data (for table display)
export type StudentWithEngagement = {
  user_id: string
  user_name: string
  avatar_url?: string
  lessons_completed: number
  total_lessons: number
  assignments_completed: number
  total_assignments: number
  trade_logs_submitted: number
  average_grade: number
  weekly_engagement_score: number
  days_inactive: number
  engagement_status: EngagementStatus
  last_active: string
}

