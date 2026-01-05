-- =====================================================
-- 006: Assignments Enhancements
-- Adds attachment support, per-student assignment targeting,
-- and late submission tracking
-- =====================================================

-- Add attachment support to assignments (for PDF/screenshots from instructor)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add is_restricted flag to assignments (like modules)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT false;

-- Add file_url to submissions for student file uploads
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add is_late flag to submissions (computed on insert/update via trigger or app logic)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;

-- Create per-student assignment linking table
CREATE TABLE IF NOT EXISTS assignment_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_targets_assignment ON assignment_targets(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_targets_user ON assignment_targets(user_id);

ALTER TABLE assignment_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignment_targets
DROP POLICY IF EXISTS "Users can view own assignment targets" ON assignment_targets;
DROP POLICY IF EXISTS "Instructors can manage assignment targets" ON assignment_targets;

CREATE POLICY "Users can view own assignment targets" ON assignment_targets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Instructors can manage assignment targets" ON assignment_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = assignment_targets.assignment_id 
      AND c.instructor_id = auth.uid()
    )
  );

-- Add screenshot_url to trade_logs for student screenshot uploads
ALTER TABLE trade_logs ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Add feedback-related columns to submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES auth.users(id);

-- Create submission_comments table for student/instructor discussion on feedback
CREATE TABLE IF NOT EXISTS submission_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_comments_submission ON submission_comments(submission_id);

ALTER TABLE submission_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for submission_comments
DROP POLICY IF EXISTS "Users can view comments on own submissions" ON submission_comments;
DROP POLICY IF EXISTS "Instructors can view all comments in their courses" ON submission_comments;
DROP POLICY IF EXISTS "Users can create comments on accessible submissions" ON submission_comments;

CREATE POLICY "Users can view comments on own submissions" ON submission_comments
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM submissions s
      WHERE s.id = submission_comments.submission_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can view all comments in their courses" ON submission_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM submissions s
      JOIN assignments a ON a.id = s.assignment_id
      JOIN courses c ON c.id = a.course_id
      WHERE s.id = submission_comments.submission_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on accessible submissions" ON submission_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      -- User owns the submission
      EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.id = submission_comments.submission_id
        AND s.user_id = auth.uid()
      )
      OR
      -- User is the instructor
      EXISTS (
        SELECT 1 FROM submissions s
        JOIN assignments a ON a.id = s.assignment_id
        JOIN courses c ON c.id = a.course_id
        WHERE s.id = submission_comments.submission_id
        AND c.instructor_id = auth.uid()
      )
    )
  );

-- Add feedback columns to trade_logs for instructor review
ALTER TABLE trade_logs ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE trade_logs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE trade_logs ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

-- Create trade_log_comments table for discussion on trade log feedback
CREATE TABLE IF NOT EXISTS trade_log_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_log_id UUID NOT NULL REFERENCES trade_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_log_comments_log ON trade_log_comments(trade_log_id);

ALTER TABLE trade_log_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for trade_log_comments
DROP POLICY IF EXISTS "Users can view comments on own trade logs" ON trade_log_comments;
DROP POLICY IF EXISTS "Instructors can view all trade log comments in their courses" ON trade_log_comments;
DROP POLICY IF EXISTS "Users can create comments on accessible trade logs" ON trade_log_comments;

CREATE POLICY "Users can view comments on own trade logs" ON trade_log_comments
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM trade_logs tl
      WHERE tl.id = trade_log_comments.trade_log_id
      AND tl.user_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can view all trade log comments in their courses" ON trade_log_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trade_logs tl
      JOIN courses c ON c.id = tl.course_id
      WHERE tl.id = trade_log_comments.trade_log_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on accessible trade logs" ON trade_log_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      -- User owns the trade log
      EXISTS (
        SELECT 1 FROM trade_logs tl
        WHERE tl.id = trade_log_comments.trade_log_id
        AND tl.user_id = auth.uid()
      )
      OR
      -- User is the instructor
      EXISTS (
        SELECT 1 FROM trade_logs tl
        JOIN courses c ON c.id = tl.course_id
        WHERE tl.id = trade_log_comments.trade_log_id
        AND c.instructor_id = auth.uid()
      )
    )
  );

