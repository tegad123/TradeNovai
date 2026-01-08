-- TradeNova University: Module Assignment Prerequisites
-- Run this in your Supabase SQL Editor
-- This allows instructors to require students to complete specific assignments
-- before they can access a module.

-- ============================================
-- MODULE ASSIGNMENT PREREQUISITES TABLE
-- ============================================
-- Links modules to required assignments that must be completed
-- before the module becomes accessible.

CREATE TABLE IF NOT EXISTS module_assignment_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_module_assignment_prereqs_module ON module_assignment_prerequisites(module_id);
CREATE INDEX IF NOT EXISTS idx_module_assignment_prereqs_assignment ON module_assignment_prerequisites(assignment_id);

ALTER TABLE module_assignment_prerequisites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view module assignment prerequisites" ON module_assignment_prerequisites;
DROP POLICY IF EXISTS "Instructors can manage module assignment prerequisites" ON module_assignment_prerequisites;

CREATE POLICY "Users can view module assignment prerequisites" ON module_assignment_prerequisites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN course_enrollments ce ON ce.course_id = m.course_id
      WHERE m.id = module_assignment_prerequisites.module_id
      AND ce.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = module_assignment_prerequisites.module_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage module assignment prerequisites" ON module_assignment_prerequisites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = module_assignment_prerequisites.module_id
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTION: Check if assignment is completed by user
-- ============================================
CREATE OR REPLACE FUNCTION is_assignment_completed(p_assignment_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM submissions s
    WHERE s.assignment_id = p_assignment_id
    AND s.student_id = p_user_id
    AND s.status = 'graded'
  );
$$;

-- ============================================
-- UPDATED HELPER FUNCTION: Check if a module is unlocked
-- Now also checks for required assignment completions
-- ============================================
CREATE OR REPLACE FUNCTION is_module_unlocked(p_module_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Check prerequisite module (if any)
    (
      CASE
        WHEN (SELECT prerequisite_module_id FROM modules WHERE id = p_module_id) IS NULL THEN true
        ELSE is_module_complete((SELECT prerequisite_module_id FROM modules WHERE id = p_module_id), p_user_id)
      END
    )
    AND
    -- Check all required assignments are completed (graded)
    NOT EXISTS (
      SELECT 1 FROM module_assignment_prerequisites map
      WHERE map.module_id = p_module_id
      AND NOT is_assignment_completed(map.assignment_id, p_user_id)
    );
$$;

