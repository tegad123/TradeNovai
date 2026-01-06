-- Fix: RLS policy recursion in messaging tables
-- Symptom: "infinite recursion detected in policy for relation \"thread_participants\"" (SQLSTATE 42P17)
-- Run this in Supabase SQL editor AFTER 003_university_tables.sql

-- ============================================
-- Helper: is_thread_participant
-- SECURITY DEFINER + row_security=off avoids RLS recursion when policies need to check participation.
-- ============================================
CREATE OR REPLACE FUNCTION is_thread_participant(p_thread_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM thread_participants tp
    WHERE tp.thread_id = p_thread_id
      AND tp.user_id = auth.uid()
  );
$$;

-- ============================================
-- THREAD PARTICIPANTS POLICIES (no self-referencing subqueries)
-- ============================================
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view thread participants" ON thread_participants;
DROP POLICY IF EXISTS "Thread creator can add participants" ON thread_participants;
DROP POLICY IF EXISTS "Thread creator can remove participants" ON thread_participants;

CREATE POLICY "Participants can view thread participants" ON thread_participants
  FOR SELECT USING (
    is_thread_participant(thread_participants.thread_id)
    OR is_course_instructor((
      SELECT mt.course_id
      FROM message_threads mt
      WHERE mt.id = thread_participants.thread_id
    ))
  );

CREATE POLICY "Thread creator can add participants" ON thread_participants
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT mt.created_by
      FROM message_threads mt
      WHERE mt.id = thread_participants.thread_id
    )
    OR is_course_instructor((
      SELECT mt.course_id
      FROM message_threads mt
      WHERE mt.id = thread_participants.thread_id
    ))
  );

CREATE POLICY "Thread creator can remove participants" ON thread_participants
  FOR DELETE USING (
    auth.uid() = (
      SELECT mt.created_by
      FROM message_threads mt
      WHERE mt.id = thread_participants.thread_id
    )
    OR is_course_instructor((
      SELECT mt.course_id
      FROM message_threads mt
      WHERE mt.id = thread_participants.thread_id
    ))
  );

-- ============================================
-- MESSAGE THREADS POLICIES (avoid direct thread_participants EXISTS)
-- ============================================
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view threads" ON message_threads;
DROP POLICY IF EXISTS "Enrolled users can create threads" ON message_threads;
DROP POLICY IF EXISTS "Creator can update thread" ON message_threads;
DROP POLICY IF EXISTS "Creator or instructor can update thread" ON message_threads;

CREATE POLICY "Participants can view threads" ON message_threads
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_thread_participant(message_threads.id)
    OR is_course_instructor(message_threads.course_id)
  );

-- Keep enrollment requirement for creating threads; instructors qualify via enrollments OR instructor check.
CREATE POLICY "Enrolled users can create threads" ON message_threads
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND (
      is_course_instructor(message_threads.course_id)
      OR EXISTS (
        SELECT 1 FROM course_enrollments
        WHERE course_enrollments.course_id = message_threads.course_id
          AND course_enrollments.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Creator or instructor can update thread" ON message_threads
  FOR UPDATE USING (
    auth.uid() = created_by
    OR is_course_instructor(message_threads.course_id)
  );

-- ============================================
-- MESSAGES POLICIES (avoid direct thread_participants EXISTS)
-- ============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON messages;

CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR is_thread_participant(messages.thread_id)
    OR is_course_instructor((
      SELECT mt.course_id
      FROM message_threads mt
      WHERE mt.id = messages.thread_id
    ))
  );

CREATE POLICY "Participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (
      is_thread_participant(messages.thread_id)
      OR is_course_instructor((
        SELECT mt.course_id
        FROM message_threads mt
        WHERE mt.id = messages.thread_id
      ))
    )
  );

CREATE POLICY "Users can mark messages as read" ON messages
  FOR UPDATE USING (
    is_thread_participant(messages.thread_id)
    OR is_course_instructor((
      SELECT mt.course_id
      FROM message_threads mt
      WHERE mt.id = messages.thread_id
    ))
  );


