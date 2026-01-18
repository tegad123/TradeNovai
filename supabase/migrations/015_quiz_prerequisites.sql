-- Quiz Targeting and Prerequisites
-- Run this in your Supabase SQL Editor
-- This allows instructors to:
-- 1. Assign specific quizzes to specific students (targeting)
-- 2. Set module prerequisites for quizzes
-- 3. Set assignment prerequisites for quizzes

-- ============================================
-- QUIZ TARGETS TABLE (per-student targeting)
-- ============================================
-- Simple targeting table following assignment_targets pattern
CREATE TABLE IF NOT EXISTS quiz_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_targets_quiz ON quiz_targets(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_targets_user ON quiz_targets(user_id);

ALTER TABLE quiz_targets ENABLE ROW LEVEL SECURITY;

-- Users can view their own quiz targets
CREATE POLICY "Users can view own quiz targets" ON quiz_targets
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_targets.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Instructors can manage quiz targets
CREATE POLICY "Instructors can manage quiz targets" ON quiz_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_targets.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- QUIZ MODULE PREREQUISITES TABLE
-- ============================================
-- Links quizzes to modules that must be completed before accessing the quiz
CREATE TABLE IF NOT EXISTS quiz_module_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_module_prereqs_quiz ON quiz_module_prerequisites(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_module_prereqs_module ON quiz_module_prerequisites(module_id);

ALTER TABLE quiz_module_prerequisites ENABLE ROW LEVEL SECURITY;

-- Users can view quiz module prerequisites
CREATE POLICY "Users can view quiz module prerequisites" ON quiz_module_prerequisites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN course_enrollments ce ON ce.course_id = q.course_id
      WHERE q.id = quiz_module_prerequisites.quiz_id
      AND ce.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_module_prerequisites.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Instructors can manage quiz module prerequisites
CREATE POLICY "Instructors can manage quiz module prerequisites" ON quiz_module_prerequisites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_module_prerequisites.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- QUIZ ASSIGNMENT PREREQUISITES TABLE
-- ============================================
-- Links quizzes to assignments that must be completed before accessing the quiz
CREATE TABLE IF NOT EXISTS quiz_assignment_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_assignment_prereqs_quiz ON quiz_assignment_prerequisites(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignment_prereqs_assignment ON quiz_assignment_prerequisites(assignment_id);

ALTER TABLE quiz_assignment_prerequisites ENABLE ROW LEVEL SECURITY;

-- Users can view quiz assignment prerequisites
CREATE POLICY "Users can view quiz assignment prerequisites" ON quiz_assignment_prerequisites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN course_enrollments ce ON ce.course_id = q.course_id
      WHERE q.id = quiz_assignment_prerequisites.quiz_id
      AND ce.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_assignment_prerequisites.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Instructors can manage quiz assignment prerequisites
CREATE POLICY "Instructors can manage quiz assignment prerequisites" ON quiz_assignment_prerequisites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_assignment_prerequisites.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTION: Check if quiz is unlocked for a user
-- ============================================
CREATE OR REPLACE FUNCTION is_quiz_unlocked(p_quiz_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_all_modules_complete BOOLEAN;
  v_all_assignments_complete BOOLEAN;
BEGIN
  -- Check if all required modules are complete
  SELECT NOT EXISTS (
    SELECT 1 FROM quiz_module_prerequisites qmp
    WHERE qmp.quiz_id = p_quiz_id
    AND NOT is_module_complete(qmp.module_id, p_user_id)
  ) INTO v_all_modules_complete;

  -- Check if all required assignments are completed (submitted or graded)
  SELECT NOT EXISTS (
    SELECT 1 FROM quiz_assignment_prerequisites qap
    WHERE qap.quiz_id = p_quiz_id
    AND NOT EXISTS (
      SELECT 1 FROM submissions s
      WHERE s.assignment_id = qap.assignment_id
      AND s.student_id = p_user_id
      AND s.status IN ('submitted', 'graded')
    )
  ) INTO v_all_assignments_complete;

  RETURN v_all_modules_complete AND v_all_assignments_complete;
END;
$$;

COMMENT ON FUNCTION is_quiz_unlocked(UUID, UUID) IS 
'Checks if a quiz is unlocked for a user by verifying all module and assignment prerequisites are met.';
