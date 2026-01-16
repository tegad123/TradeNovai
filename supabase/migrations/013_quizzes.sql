-- Quiz Feature Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- QUIZZES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Settings
  time_limit_minutes INTEGER, -- NULL = untimed
  points_possible INTEGER DEFAULT 100,
  passing_score INTEGER DEFAULT 70, -- percentage
  max_attempts INTEGER DEFAULT 1, -- NULL = unlimited
  shuffle_questions BOOLEAN DEFAULT false,
  shuffle_options BOOLEAN DEFAULT false,
  show_correct_answers BOOLEAN DEFAULT true, -- show after submission
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  is_restricted BOOLEAN DEFAULT false, -- if true, only assigned students can see
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module ON quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON quizzes(is_published) WHERE is_published = true;

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Students can view published quizzes in enrolled courses
CREATE POLICY "Enrolled users can view published quizzes" ON quizzes
  FOR SELECT USING (
    (is_published = true AND EXISTS (
      SELECT 1 FROM course_enrollments 
      WHERE course_enrollments.course_id = quizzes.course_id 
      AND course_enrollments.user_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = quizzes.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can insert quizzes" ON quizzes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = quizzes.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update quizzes" ON quizzes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = quizzes.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can delete quizzes" ON quizzes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = quizzes.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- ============================================
-- QUIZ QUESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  points INTEGER DEFAULT 10,
  "order" INTEGER NOT NULL DEFAULT 0,
  
  -- For short answer: optional correct answer for reference
  correct_answer_text TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Students can view questions for quizzes they can access
CREATE POLICY "Users can view quiz questions" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_questions.quiz_id
      AND (
        (q.is_published = true AND EXISTS (
          SELECT 1 FROM course_enrollments ce
          WHERE ce.course_id = q.course_id AND ce.user_id = auth.uid()
        ))
        OR EXISTS (
          SELECT 1 FROM courses c
          WHERE c.id = q.course_id AND c.instructor_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Instructors can insert questions" ON quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_questions.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update questions" ON quiz_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_questions.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can delete questions" ON quiz_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_questions.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- QUIZ QUESTION OPTIONS TABLE (for MC and T/F)
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON quiz_question_options(question_id);

ALTER TABLE quiz_question_options ENABLE ROW LEVEL SECURITY;

-- Students can view options for questions they can access
CREATE POLICY "Users can view question options" ON quiz_question_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_questions qq
      JOIN quizzes q ON q.id = qq.quiz_id
      WHERE qq.id = quiz_question_options.question_id
      AND (
        (q.is_published = true AND EXISTS (
          SELECT 1 FROM course_enrollments ce
          WHERE ce.course_id = q.course_id AND ce.user_id = auth.uid()
        ))
        OR EXISTS (
          SELECT 1 FROM courses c
          WHERE c.id = q.course_id AND c.instructor_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Instructors can insert options" ON quiz_question_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_questions qq
      JOIN quizzes q ON q.id = qq.quiz_id
      JOIN courses c ON c.id = q.course_id
      WHERE qq.id = quiz_question_options.question_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update options" ON quiz_question_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quiz_questions qq
      JOIN quizzes q ON q.id = qq.quiz_id
      JOIN courses c ON c.id = q.course_id
      WHERE qq.id = quiz_question_options.question_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can delete options" ON quiz_question_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quiz_questions qq
      JOIN quizzes q ON q.id = qq.quiz_id
      JOIN courses c ON c.id = q.course_id
      WHERE qq.id = quiz_question_options.question_id
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- QUIZ ATTEMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  attempt_number INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  
  -- Calculated after submission
  score INTEGER, -- points earned
  score_percentage DECIMAL, -- percentage
  time_spent_seconds INTEGER,
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded', 'timed_out')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Students can view their own attempts
CREATE POLICY "Students can view own attempts" ON quiz_attempts
  FOR SELECT USING (auth.uid() = student_id);

-- Instructors can view attempts for their quizzes
CREATE POLICY "Instructors can view quiz attempts" ON quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_attempts.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Students can create attempts for published quizzes
CREATE POLICY "Students can create attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM quizzes q
      JOIN course_enrollments ce ON ce.course_id = q.course_id
      WHERE q.id = quiz_attempts.quiz_id
      AND q.is_published = true
      AND ce.user_id = auth.uid()
      AND ce.role = 'student'
    )
  );

-- Students can update their in-progress attempts
CREATE POLICY "Students can update own attempts" ON quiz_attempts
  FOR UPDATE USING (
    auth.uid() = student_id 
    AND status = 'in_progress'
  );

-- Instructors can update attempts (for grading)
CREATE POLICY "Instructors can update attempts" ON quiz_attempts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_attempts.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- QUIZ RESPONSES TABLE (individual answers)
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  
  -- For MC/TF questions
  selected_option_id UUID REFERENCES quiz_question_options(id) ON DELETE SET NULL,
  
  -- For short answer questions
  text_response TEXT,
  
  -- Grading
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  
  -- For instructor feedback on short answers
  instructor_feedback TEXT,
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_responses_attempt ON quiz_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_question ON quiz_responses(question_id);

ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

-- Students can view their own responses
CREATE POLICY "Students can view own responses" ON quiz_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      WHERE qa.id = quiz_responses.attempt_id
      AND qa.student_id = auth.uid()
    )
  );

-- Instructors can view responses for their quizzes
CREATE POLICY "Instructors can view responses" ON quiz_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      JOIN quizzes q ON q.id = qa.quiz_id
      JOIN courses c ON c.id = q.course_id
      WHERE qa.id = quiz_responses.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Students can insert responses for their attempts
CREATE POLICY "Students can insert responses" ON quiz_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      WHERE qa.id = quiz_responses.attempt_id
      AND qa.student_id = auth.uid()
      AND qa.status = 'in_progress'
    )
  );

-- Students can update responses for in-progress attempts
CREATE POLICY "Students can update responses" ON quiz_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      WHERE qa.id = quiz_responses.attempt_id
      AND qa.student_id = auth.uid()
      AND qa.status = 'in_progress'
    )
  );

-- Instructors can update responses (for grading short answers)
CREATE POLICY "Instructors can grade responses" ON quiz_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      JOIN quizzes q ON q.id = qa.quiz_id
      JOIN courses c ON c.id = q.course_id
      WHERE qa.id = quiz_responses.attempt_id
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- QUIZ ASSIGNMENTS TABLE (per-student targeting)
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  
  due_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Either user_id or module_id should be set
  CHECK (user_id IS NOT NULL OR module_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz ON quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_user ON quiz_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_module ON quiz_assignments(module_id);

ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quiz assignments" ON quiz_assignments
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_assignments.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage quiz assignments" ON quiz_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_assignments.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_questions_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_attempts_updated_at
  BEFORE UPDATE ON quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_responses_updated_at
  BEFORE UPDATE ON quiz_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTION: Check if student can attempt quiz
-- ============================================
CREATE OR REPLACE FUNCTION can_attempt_quiz(p_quiz_id UUID, p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_attempts INTEGER;
  v_current_attempts INTEGER;
BEGIN
  -- Get max attempts for quiz
  SELECT max_attempts INTO v_max_attempts
  FROM quizzes WHERE id = p_quiz_id;
  
  -- If unlimited attempts
  IF v_max_attempts IS NULL THEN
    RETURN true;
  END IF;
  
  -- Count current attempts
  SELECT COUNT(*) INTO v_current_attempts
  FROM quiz_attempts
  WHERE quiz_id = p_quiz_id 
    AND student_id = p_student_id
    AND status IN ('submitted', 'graded');
  
  RETURN v_current_attempts < v_max_attempts;
END;
$$;

-- ============================================
-- HELPER FUNCTION: Calculate quiz score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_quiz_score(p_attempt_id UUID)
RETURNS TABLE (
  total_points INTEGER,
  earned_points INTEGER,
  percentage DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_earned INTEGER;
BEGIN
  -- Get total possible points
  SELECT COALESCE(SUM(qq.points), 0) INTO v_total
  FROM quiz_questions qq
  JOIN quiz_attempts qa ON qa.quiz_id = qq.quiz_id
  WHERE qa.id = p_attempt_id;
  
  -- Get earned points
  SELECT COALESCE(SUM(qr.points_earned), 0) INTO v_earned
  FROM quiz_responses qr
  WHERE qr.attempt_id = p_attempt_id;
  
  total_points := v_total;
  earned_points := v_earned;
  percentage := CASE WHEN v_total > 0 THEN ROUND((v_earned::DECIMAL / v_total) * 100, 2) ELSE 0 END;
  
  RETURN NEXT;
END;
$$;
