-- TradeNova University/LMS Tables Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  access_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_access_code ON courses(access_code);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- IMPORTANT:
-- We create course policies AFTER `course_enrollments` exists (policies reference it).

-- ============================================
-- HELPER FUNCTION: Is current user the instructor of a course?
-- Used to avoid RLS recursion between `courses` <-> `course_enrollments`
-- ============================================
CREATE OR REPLACE FUNCTION is_course_instructor(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM courses c
    WHERE c.id = p_course_id
      AND c.instructor_id = auth.uid()
  );
$$;

-- ============================================
-- COURSE ENROLLMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON course_enrollments(course_id);

ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Instructors can view course enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Users can enroll themselves" ON course_enrollments;
DROP POLICY IF EXISTS "Users can unenroll themselves" ON course_enrollments;

CREATE POLICY "Users can view own enrollments" ON course_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view course enrollments" ON course_enrollments
  FOR SELECT USING (is_course_instructor(course_enrollments.course_id));

CREATE POLICY "Users can enroll themselves" ON course_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unenroll themselves" ON course_enrollments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- COURSES POLICIES (after course_enrollments exists)
-- ============================================
DROP POLICY IF EXISTS "Users can view courses" ON courses;
DROP POLICY IF EXISTS "Instructors can insert courses" ON courses;
DROP POLICY IF EXISTS "Instructors can update own courses" ON courses;
DROP POLICY IF EXISTS "Instructors can delete own courses" ON courses;

-- Anyone can view courses they're enrolled in (handled via enrollments)
CREATE POLICY "Users can view courses" ON courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments 
      WHERE course_enrollments.course_id = courses.id 
      AND course_enrollments.user_id = auth.uid()
    )
    OR instructor_id = auth.uid()
  );

CREATE POLICY "Instructors can insert courses" ON courses
  FOR INSERT WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "Instructors can update own courses" ON courses
  FOR UPDATE USING (auth.uid() = instructor_id);

CREATE POLICY "Instructors can delete own courses" ON courses
  FOR DELETE USING (auth.uid() = instructor_id);

-- ============================================
-- MODULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view published modules" ON modules
  FOR SELECT USING (
    (is_published = true AND EXISTS (
      SELECT 1 FROM course_enrollments 
      WHERE course_enrollments.course_id = modules.course_id 
      AND course_enrollments.user_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = modules.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can insert modules" ON modules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = modules.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update modules" ON modules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = modules.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can delete modules" ON modules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = modules.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- ============================================
-- LESSONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view lessons" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN course_enrollments ce ON ce.course_id = m.course_id
      WHERE m.id = lessons.module_id 
      AND ce.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id 
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can insert lessons" ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id 
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update lessons" ON lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id 
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can delete lessons" ON lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id 
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- LESSON PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view student progress" ON lesson_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = lesson_progress.lesson_id 
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own progress" ON lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  points INTEGER DEFAULT 100,
  type TEXT DEFAULT 'reflection' CHECK (type IN ('reflection', 'trade_analysis', 'quiz', 'journal')),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view published assignments" ON assignments
  FOR SELECT USING (
    (is_published = true AND EXISTS (
      SELECT 1 FROM course_enrollments 
      WHERE course_enrollments.course_id = assignments.course_id 
      AND course_enrollments.user_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = assignments.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can insert assignments" ON assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = assignments.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update assignments" ON assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = assignments.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can delete assignments" ON assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = assignments.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- ============================================
-- SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  grade INTEGER,
  feedback TEXT,
  graded_at TIMESTAMPTZ,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('pending', 'submitted', 'graded', 'returned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own submissions" ON submissions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Instructors can view course submissions" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = submissions.assignment_id 
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own submissions" ON submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own pending submissions" ON submissions
  FOR UPDATE USING (auth.uid() = student_id AND status IN ('pending', 'submitted'));

CREATE POLICY "Instructors can update submissions for grading" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = submissions.assignment_id 
      AND c.instructor_id = auth.uid()
    )
  );

-- ============================================
-- MESSAGE THREADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_course ON message_threads(course_id);
CREATE INDEX IF NOT EXISTS idx_threads_created_by ON message_threads(created_by);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- IMPORTANT:
-- We create message thread policies AFTER `thread_participants` exists (policies reference it).

-- ============================================
-- THREAD PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_thread ON thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON thread_participants(user_id);

ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view thread participants" ON thread_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thread_participants tp2
      WHERE tp2.thread_id = thread_participants.thread_id 
      AND tp2.user_id = auth.uid()
    )
  );

CREATE POLICY "Thread creator can add participants" ON thread_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM message_threads 
      WHERE message_threads.id = thread_participants.thread_id 
      AND message_threads.created_by = auth.uid()
    )
  );

-- ============================================
-- MESSAGE THREADS POLICIES (after thread_participants exists)
-- ============================================
DROP POLICY IF EXISTS "Participants can view threads" ON message_threads;
DROP POLICY IF EXISTS "Enrolled users can create threads" ON message_threads;
DROP POLICY IF EXISTS "Creator can update thread" ON message_threads;

CREATE POLICY "Participants can view threads" ON message_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thread_participants 
      WHERE thread_participants.thread_id = message_threads.id 
      AND thread_participants.user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Enrolled users can create threads" ON message_threads
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM course_enrollments 
      WHERE course_enrollments.course_id = message_threads.course_id 
      AND course_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can update thread" ON message_threads
  FOR UPDATE USING (auth.uid() = created_by);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thread_participants 
      WHERE thread_participants.thread_id = messages.thread_id 
      AND thread_participants.user_id = auth.uid()
    )
    OR sender_id = auth.uid()
  );

CREATE POLICY "Participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM thread_participants 
      WHERE thread_participants.thread_id = messages.thread_id 
      AND thread_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM thread_participants 
      WHERE thread_participants.thread_id = messages.thread_id 
      AND thread_participants.user_id = auth.uid()
    )
  );

-- ============================================
-- TRADE LOGS TABLE (University)
-- ============================================
CREATE TABLE IF NOT EXISTS university_trade_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  entry_price DECIMAL NOT NULL,
  exit_price DECIMAL NOT NULL,
  pnl DECIMAL NOT NULL,
  reflection TEXT NOT NULL,
  screenshots JSONB DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  instructor_feedback TEXT,
  feedback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_logs_course ON university_trade_logs(course_id);
CREATE INDEX IF NOT EXISTS idx_trade_logs_student ON university_trade_logs(student_id);

ALTER TABLE university_trade_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own trade logs" ON university_trade_logs
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Instructors can view course trade logs" ON university_trade_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = university_trade_logs.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own trade logs" ON university_trade_logs
  FOR INSERT WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM course_enrollments 
      WHERE course_enrollments.course_id = university_trade_logs.course_id 
      AND course_enrollments.user_id = auth.uid()
      AND course_enrollments.role = 'student'
    )
  );

CREATE POLICY "Students can update own pending trade logs" ON university_trade_logs
  FOR UPDATE USING (auth.uid() = student_id AND instructor_feedback IS NULL);

CREATE POLICY "Instructors can add feedback" ON university_trade_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = university_trade_logs.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- ============================================
-- USER PROFILES TABLE (for names/avatars)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_threads_updated_at
  BEFORE UPDATE ON message_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_logs_updated_at
  BEFORE UPDATE ON university_trade_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ENABLE REALTIME FOR MESSAGES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;

-- ============================================
-- HELPER FUNCTION: Get course by access code (public)
-- ============================================
CREATE OR REPLACE FUNCTION get_course_by_access_code(p_access_code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  description TEXT,
  instructor_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.code, c.description, c.instructor_id
  FROM courses c
  WHERE LOWER(c.access_code) = LOWER(p_access_code);
END;
$$;

