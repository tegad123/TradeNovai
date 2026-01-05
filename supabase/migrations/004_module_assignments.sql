-- TradeNova Module Assignments Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- ADD IS_RESTRICTED TO MODULES
-- ============================================
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT false;

-- ============================================
-- MODULE ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS module_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_module_assignments_module ON module_assignments(module_id);
CREATE INDEX IF NOT EXISTS idx_module_assignments_user ON module_assignments(user_id);

ALTER TABLE module_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MODULE ASSIGNMENTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own module assignments" ON module_assignments;
DROP POLICY IF EXISTS "Instructors can view and manage module assignments" ON module_assignments;

CREATE POLICY "Users can view own module assignments" ON module_assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view and manage module assignments" ON module_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = module_assignments.module_id 
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- UPDATE MODULE SELECT POLICY
-- ============================================
-- We need to replace the old "Enrolled users can view published modules" policy
-- to account for is_restricted.

DROP POLICY IF EXISTS "Enrolled users can view published modules" ON modules;

CREATE POLICY "Enrolled users can view published modules" ON modules
  FOR SELECT USING (
    -- Instructor can always see everything
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = modules.course_id 
      AND courses.instructor_id = auth.uid()
    )
    OR 
    -- Students can see if published AND (not restricted OR assigned to them)
    (
      is_published = true 
      AND EXISTS (
        SELECT 1 FROM course_enrollments 
        WHERE course_enrollments.course_id = modules.course_id 
        AND course_enrollments.user_id = auth.uid()
      )
      AND (
        is_restricted = false 
        OR EXISTS (
          SELECT 1 FROM module_assignments 
          WHERE module_assignments.module_id = modules.id 
          AND module_assignments.user_id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- UPDATE LESSON SELECT POLICY
-- ============================================
-- Lessons should also respect module restrictions.

DROP POLICY IF EXISTS "Enrolled users can view lessons" ON lessons;

CREATE POLICY "Enrolled users can view lessons" ON lessons
  FOR SELECT USING (
    -- Instructor can always see everything
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id 
      AND c.instructor_id = auth.uid()
    )
    OR
    -- Students can see if module is accessible to them
    EXISTS (
      SELECT 1 FROM modules m
      JOIN course_enrollments ce ON ce.course_id = m.course_id
      WHERE m.id = lessons.module_id 
      AND ce.user_id = auth.uid()
      AND m.is_published = true
      AND (
        m.is_restricted = false 
        OR EXISTS (
          SELECT 1 FROM module_assignments ma
          WHERE ma.module_id = m.id 
          AND ma.user_id = auth.uid()
        )
      )
    )
  );

