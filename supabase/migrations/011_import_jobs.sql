-- ============================================
-- IMPORT JOBS TABLE
-- Track trade import history for AI context
-- ============================================

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker TEXT,
  filename TEXT,
  trades_imported INTEGER DEFAULT 0,
  executions_imported INTEGER DEFAULT 0,
  duplicates_skipped INTEGER DEFAULT 0,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  symbols JSONB DEFAULT '[]'::jsonb,
  total_pnl DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON import_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own import jobs" ON import_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import jobs" ON import_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own import jobs" ON import_jobs
  FOR DELETE USING (auth.uid() = user_id);

