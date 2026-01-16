-- Fix Quiz Attempt Handling
-- This migration updates the can_attempt_quiz function to count ALL attempts
-- (including in_progress) to prevent students from gaming the max_attempts limit
-- by creating multiple in-progress attempts.
--
-- Run this in your Supabase SQL Editor

-- ============================================
-- UPDATED HELPER FUNCTION: Check if student can attempt quiz
-- Now counts ALL attempts, not just completed ones
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
  
  -- Count ALL attempts (including in_progress) to prevent gaming
  -- Students cannot bypass max_attempts by creating multiple in-progress attempts
  SELECT COUNT(*) INTO v_current_attempts
  FROM quiz_attempts
  WHERE quiz_id = p_quiz_id 
    AND student_id = p_student_id;
  
  RETURN v_current_attempts < v_max_attempts;
END;
$$;

-- Add a comment explaining the change
COMMENT ON FUNCTION can_attempt_quiz(UUID, UUID) IS 
'Checks if a student can start a new quiz attempt. Counts ALL attempts (including in_progress) 
to prevent students from bypassing max_attempts by creating multiple in-progress attempts.
The application code (startQuizAttempt) now checks for existing in-progress attempts first 
and resumes them instead of creating new ones.';
