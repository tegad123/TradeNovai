-- TradeNova University: Module Prerequisites & Assignment Prerequisites
-- Run this in your Supabase SQL Editor

-- ============================================
-- ADD PREREQUISITE COLUMN TO MODULES
-- ============================================
-- This allows instructors to set a prerequisite module that must be
-- completed before students can access this module.

ALTER TABLE modules ADD COLUMN IF NOT EXISTS prerequisite_module_id UUID REFERENCES modules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_modules_prerequisite ON modules(prerequisite_module_id);

-- ============================================
-- ASSIGNMENT MODULE PREREQUISITES TABLE
-- ============================================
-- This allows assignments to require completion of multiple modules
-- before they become available to students.

CREATE TABLE IF NOT EXISTS assignment_module_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_prereqs_assignment ON assignment_module_prerequisites(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_prereqs_module ON assignment_module_prerequisites(module_id);

ALTER TABLE assignment_module_prerequisites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignment_module_prerequisites
DROP POLICY IF EXISTS "Users can view assignment prerequisites" ON assignment_module_prerequisites;
DROP POLICY IF EXISTS "Instructors can manage assignment prerequisites" ON assignment_module_prerequisites;

CREATE POLICY "Users can view assignment prerequisites" ON assignment_module_prerequisites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN course_enrollments ce ON ce.course_id = a.course_id
      WHERE a.id = assignment_module_prerequisites.assignment_id
      AND ce.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = assignment_module_prerequisites.assignment_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage assignment prerequisites" ON assignment_module_prerequisites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = assignment_module_prerequisites.assignment_id
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTION: Check if a module is complete for a user
-- ============================================
CREATE OR REPLACE FUNCTION is_module_complete(p_module_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    -- Find any lesson in this module that is NOT completed by this user
    SELECT 1
    FROM lessons l
    WHERE l.module_id = p_module_id
    AND NOT EXISTS (
      SELECT 1 FROM lesson_progress lp
      WHERE lp.lesson_id = l.id
      AND lp.user_id = p_user_id
      AND lp.is_completed = true
    )
  )
  AND EXISTS (
    -- Ensure the module has at least one lesson
    SELECT 1 FROM lessons WHERE module_id = p_module_id
  );
$$;

-- ============================================
-- HELPER FUNCTION: Check if a module is unlocked for a user
-- ============================================
CREATE OR REPLACE FUNCTION is_module_unlocked(p_module_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE
      -- If no prerequisite, module is unlocked
      WHEN (SELECT prerequisite_module_id FROM modules WHERE id = p_module_id) IS NULL THEN true
      -- If prerequisite exists, check if it's complete
      ELSE is_module_complete((SELECT prerequisite_module_id FROM modules WHERE id = p_module_id), p_user_id)
    END;
$$;

