-- Engagement Tracking & Dispute Evidence Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- STUDENT ENGAGEMENT METRICS TABLE
-- Daily aggregated metrics for tracking student engagement
-- ============================================
CREATE TABLE IF NOT EXISTS student_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Daily activity counts
  lessons_completed_today INTEGER DEFAULT 0,
  assignments_submitted_today INTEGER DEFAULT 0,
  trade_logs_submitted_today INTEGER DEFAULT 0,
  messages_sent_today INTEGER DEFAULT 0,
  
  -- Engagement scores (0-100)
  daily_engagement_score INTEGER DEFAULT 0,
  weekly_engagement_score INTEGER DEFAULT 0,
  
  -- Risk indicators
  is_at_risk BOOLEAN DEFAULT false,
  days_inactive INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, course_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_engagement_user ON student_engagement_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_course ON student_engagement_metrics(course_id);
CREATE INDEX IF NOT EXISTS idx_engagement_date ON student_engagement_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_at_risk ON student_engagement_metrics(is_at_risk) WHERE is_at_risk = true;

ALTER TABLE student_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Students can view their own metrics
CREATE POLICY "Students can view own engagement metrics" ON student_engagement_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Instructors can view metrics for their courses
CREATE POLICY "Instructors can view course engagement metrics" ON student_engagement_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = student_engagement_metrics.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- System can insert/update metrics (via service role or cron)
CREATE POLICY "System can manage engagement metrics" ON student_engagement_metrics
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ACTIVITY AUDIT LOG TABLE
-- Detailed event logging for evidence collection
-- ============================================
CREATE TABLE IF NOT EXISTS activity_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  
  -- Related entities (optional)
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  
  -- Evidence metadata
  ip_address TEXT,
  user_agent TEXT,
  session_duration_seconds INTEGER,
  
  -- Flexible metadata storage
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON activity_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_course ON activity_audit_log(course_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON activity_audit_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_audit_created ON activity_audit_log(created_at DESC);

ALTER TABLE activity_audit_log ENABLE ROW LEVEL SECURITY;

-- Students can view their own audit logs
CREATE POLICY "Students can view own audit logs" ON activity_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Instructors can view audit logs for their courses
CREATE POLICY "Instructors can view course audit logs" ON activity_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = activity_audit_log.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON activity_audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================
-- DISPUTE EVIDENCE DOCUMENTS TABLE
-- Stores generated PDF document metadata
-- ============================================
CREATE TABLE IF NOT EXISTS dispute_evidence_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File information
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  
  -- Evidence snapshot at time of generation
  evidence_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Dispute context (optional)
  dispute_reason TEXT,
  dispute_amount DECIMAL,
  
  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_docs_user ON dispute_evidence_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_docs_course ON dispute_evidence_documents(course_id);
CREATE INDEX IF NOT EXISTS idx_dispute_docs_generated_by ON dispute_evidence_documents(generated_by);

ALTER TABLE dispute_evidence_documents ENABLE ROW LEVEL SECURITY;

-- Instructors can view documents they generated
CREATE POLICY "Instructors can view own generated documents" ON dispute_evidence_documents
  FOR SELECT USING (auth.uid() = generated_by);

-- Instructors can insert documents for their courses
CREATE POLICY "Instructors can create dispute documents" ON dispute_evidence_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = dispute_evidence_documents.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- ============================================
-- TERMS ACCEPTANCE LOG TABLE
-- Records when students accept ToS for evidence
-- ============================================
CREATE TABLE IF NOT EXISTS terms_acceptance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Terms version and content hash for verification
  terms_version TEXT NOT NULL DEFAULT '1.0',
  terms_content_hash TEXT,
  
  -- Evidence metadata
  ip_address TEXT,
  user_agent TEXT,
  
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, course_id, terms_version)
);

CREATE INDEX IF NOT EXISTS idx_terms_user ON terms_acceptance_log(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_course ON terms_acceptance_log(course_id);

ALTER TABLE terms_acceptance_log ENABLE ROW LEVEL SECURITY;

-- Students can view their own terms acceptance
CREATE POLICY "Students can view own terms acceptance" ON terms_acceptance_log
  FOR SELECT USING (auth.uid() = user_id);

-- Instructors can view terms acceptance for their courses
CREATE POLICY "Instructors can view course terms acceptance" ON terms_acceptance_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = terms_acceptance_log.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- System can insert terms acceptance
CREATE POLICY "System can insert terms acceptance" ON terms_acceptance_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- CALCULATE DAILY ENGAGEMENT FUNCTION
-- Aggregates daily metrics from existing tables
-- ============================================
CREATE OR REPLACE FUNCTION calculate_daily_engagement()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  student RECORD;
BEGIN
  -- Loop through all enrolled students
  FOR student IN
    SELECT DISTINCT ce.user_id, ce.course_id
    FROM course_enrollments ce
    WHERE ce.role = 'student'
  LOOP
    -- Calculate daily metrics
    DECLARE
      lessons_today INTEGER;
      assignments_today INTEGER;
      trade_logs_today INTEGER;
      messages_today INTEGER;
      daily_score INTEGER;
      weekly_score INTEGER;
      inactive_days INTEGER;
      at_risk BOOLEAN;
    BEGIN
      -- Count lessons completed today
      SELECT COUNT(*) INTO lessons_today
      FROM lesson_progress lp
      JOIN lessons l ON l.id = lp.lesson_id
      JOIN modules m ON m.id = l.module_id
      WHERE lp.user_id = student.user_id
        AND m.course_id = student.course_id
        AND lp.completed_at::date = today;

      -- Count assignments submitted today
      SELECT COUNT(*) INTO assignments_today
      FROM submissions s
      JOIN assignments a ON a.id = s.assignment_id
      WHERE s.student_id = student.user_id
        AND a.course_id = student.course_id
        AND s.submitted_at::date = today;

      -- Count trade logs submitted today
      SELECT COUNT(*) INTO trade_logs_today
      FROM university_trade_logs
      WHERE student_id = student.user_id
        AND course_id = student.course_id
        AND submitted_at::date = today;

      -- Count messages sent today
      SELECT COUNT(*) INTO messages_today
      FROM messages msg
      JOIN message_threads mt ON mt.id = msg.thread_id
      WHERE msg.sender_id = student.user_id
        AND mt.course_id = student.course_id
        AND msg.created_at::date = today;

      -- Calculate daily engagement score (0-100)
      daily_score := LEAST(100, (
        lessons_today * 25 +
        assignments_today * 30 +
        trade_logs_today * 25 +
        messages_today * 10
      ));

      -- Calculate 7-day rolling average
      SELECT COALESCE(AVG(daily_engagement_score), 0)::INTEGER INTO weekly_score
      FROM student_engagement_metrics
      WHERE user_id = student.user_id
        AND course_id = student.course_id
        AND metric_date >= today - INTERVAL '7 days';

      -- Calculate days since last activity
      SELECT COALESCE(
        EXTRACT(DAY FROM NOW() - MAX(last_activity))::INTEGER, 0
      ) INTO inactive_days
      FROM (
        SELECT MAX(completed_at) as last_activity FROM lesson_progress lp
          JOIN lessons l ON l.id = lp.lesson_id
          JOIN modules m ON m.id = l.module_id
          WHERE lp.user_id = student.user_id AND m.course_id = student.course_id
        UNION ALL
        SELECT MAX(submitted_at) FROM submissions s
          JOIN assignments a ON a.id = s.assignment_id
          WHERE s.student_id = student.user_id AND a.course_id = student.course_id
        UNION ALL
        SELECT MAX(submitted_at) FROM university_trade_logs
          WHERE student_id = student.user_id AND course_id = student.course_id
        UNION ALL
        SELECT MAX(created_at) FROM messages msg
          JOIN message_threads mt ON mt.id = msg.thread_id
          WHERE msg.sender_id = student.user_id AND mt.course_id = student.course_id
      ) activities;

      -- Determine at-risk status
      at_risk := inactive_days > 7 OR weekly_score < 40;

      -- Upsert the daily metric
      INSERT INTO student_engagement_metrics (
        user_id,
        course_id,
        metric_date,
        lessons_completed_today,
        assignments_submitted_today,
        trade_logs_submitted_today,
        messages_sent_today,
        daily_engagement_score,
        weekly_engagement_score,
        is_at_risk,
        days_inactive
      ) VALUES (
        student.user_id,
        student.course_id,
        today,
        lessons_today,
        assignments_today,
        trade_logs_today,
        messages_today,
        daily_score,
        weekly_score,
        at_risk,
        inactive_days
      )
      ON CONFLICT (user_id, course_id, metric_date)
      DO UPDATE SET
        lessons_completed_today = EXCLUDED.lessons_completed_today,
        assignments_submitted_today = EXCLUDED.assignments_submitted_today,
        trade_logs_submitted_today = EXCLUDED.trade_logs_submitted_today,
        messages_sent_today = EXCLUDED.messages_sent_today,
        daily_engagement_score = EXCLUDED.daily_engagement_score,
        weekly_engagement_score = EXCLUDED.weekly_engagement_score,
        is_at_risk = EXCLUDED.is_at_risk,
        days_inactive = EXCLUDED.days_inactive,
        updated_at = NOW();
    END;
  END LOOP;
END;
$$;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_engagement_metrics_updated_at
  BEFORE UPDATE ON student_engagement_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dispute_documents_updated_at
  BEFORE UPDATE ON dispute_evidence_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKET SETUP (Run in Supabase Dashboard or via SQL)
-- ============================================
-- Note: You may need to run these in the Supabase Dashboard Storage section
-- or with service role privileges

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('dispute-evidence', 'dispute-evidence', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for dispute-evidence bucket
-- CREATE POLICY "Instructors can upload dispute evidence"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'dispute-evidence' AND
--   EXISTS (
--     SELECT 1 FROM course_enrollments
--     WHERE course_enrollments.user_id = auth.uid()
--     AND course_enrollments.role = 'instructor'
--   )
-- );

-- CREATE POLICY "Instructors can view dispute evidence"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'dispute-evidence' AND
--   EXISTS (
--     SELECT 1 FROM dispute_evidence_documents
--     WHERE dispute_evidence_documents.generated_by = auth.uid()
--   )
-- );

