// Quiz Feature Types

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer'

export type QuizAttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'timed_out'

export interface Quiz {
  id: string
  course_id: string
  module_id: string | null
  title: string
  description: string | null
  time_limit_minutes: number | null
  points_possible: number
  passing_score: number
  max_attempts: number | null
  shuffle_questions: boolean
  shuffle_options: boolean
  show_correct_answers: boolean
  is_published: boolean
  is_restricted: boolean
  created_at: string
  updated_at: string
  // Joined data
  questions?: QuizQuestion[]
  question_count?: number
  attempt_count?: number
  module_title?: string
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question_text: string
  question_type: QuestionType
  points: number
  order: number
  correct_answer_text: string | null
  created_at: string
  updated_at: string
  // Joined data
  options?: QuizQuestionOption[]
}

export interface QuizQuestionOption {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  order: number
  created_at: string
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  student_id: string
  attempt_number: number
  started_at: string
  submitted_at: string | null
  score: number | null
  score_percentage: number | null
  time_spent_seconds: number | null
  status: QuizAttemptStatus
  created_at: string
  updated_at: string
  // Joined data
  quiz?: Quiz
  responses?: QuizResponse[]
  student_name?: string
  student_email?: string
}

export interface QuizResponse {
  id: string
  attempt_id: string
  question_id: string
  selected_option_id: string | null
  text_response: string | null
  is_correct: boolean | null
  points_earned: number
  instructor_feedback: string | null
  graded_by: string | null
  graded_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  question?: QuizQuestion
  selected_option?: QuizQuestionOption
}

export interface QuizAssignment {
  id: string
  quiz_id: string
  user_id: string | null
  module_id: string | null
  due_date: string | null
  created_at: string
}

// Form types for creating/editing
export interface CreateQuizData {
  title: string
  description?: string
  time_limit_minutes?: number | null
  points_possible?: number
  passing_score?: number
  max_attempts?: number | null
  shuffle_questions?: boolean
  shuffle_options?: boolean
  show_correct_answers?: boolean
  module_id?: string | null
}

export interface CreateQuestionData {
  question_text: string
  question_type: QuestionType
  points?: number
  order?: number
  correct_answer_text?: string | null
  options?: CreateOptionData[]
}

export interface CreateOptionData {
  option_text: string
  is_correct: boolean
  order?: number
}

// Response types for API
export interface QuizWithQuestions extends Quiz {
  questions: QuizQuestionWithOptions[]
}

export interface QuizQuestionWithOptions extends QuizQuestion {
  options: QuizQuestionOption[]
}

// Attempt submission
export interface SubmitQuizData {
  attempt_id: string
  responses: SubmitResponseData[]
}

export interface SubmitResponseData {
  question_id: string
  selected_option_id?: string | null
  text_response?: string | null
}

// Quiz results/stats
export interface QuizStats {
  total_attempts: number
  average_score: number
  highest_score: number
  lowest_score: number
  pass_rate: number
  average_time_seconds: number
}

export interface StudentQuizResult {
  attempt: QuizAttempt
  responses: QuizResponseWithDetails[]
  total_points: number
  earned_points: number
  percentage: number
  passed: boolean
}

export interface QuizResponseWithDetails extends QuizResponse {
  question: QuizQuestion
  correct_option?: QuizQuestionOption
}

// Timer state
export interface QuizTimerState {
  remaining_seconds: number
  is_running: boolean
  is_expired: boolean
}

// Quiz taking state
export interface QuizTakingState {
  quiz: QuizWithQuestions
  attempt: QuizAttempt
  current_question_index: number
  responses: Map<string, SubmitResponseData>
  timer: QuizTimerState | null
}
