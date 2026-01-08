-- ============================================
-- JOURNAL ENTRIES TABLE
-- For AI-assisted trade journaling
-- ============================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  
  -- Journal content
  content TEXT NOT NULL,
  
  -- Metadata
  emotion TEXT CHECK (emotion IN ('confident', 'fearful', 'greedy', 'patient', 'impatient', 'neutral', 'frustrated', 'excited', 'anxious', 'calm')),
  mistakes JSONB DEFAULT '[]'::jsonb,
  rules_followed JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- AI-generated insights
  ai_summary TEXT,
  ai_action_items JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_trade ON journal_entries(trade_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created ON journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_emotion ON journal_entries(emotion);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own journal entries" ON journal_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries" ON journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries" ON journal_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries" ON journal_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CHAT HISTORY TABLE
-- For persisting AI chat conversations
-- ============================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Related entities
  related_trade_ids JSONB DEFAULT '[]'::jsonb,
  related_journal_ids JSONB DEFAULT '[]'::jsonb,
  
  -- Actions taken
  actions_executed JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- USER TRADING GOALS TABLE
-- For personalized AI context
-- ============================================

CREATE TABLE IF NOT EXISTS user_trading_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Risk parameters
  max_risk_per_trade DECIMAL,
  max_daily_loss DECIMAL,
  daily_profit_target DECIMAL,
  max_trades_per_day INTEGER,
  
  -- Trading style
  preferred_instruments JSONB DEFAULT '[]'::jsonb,
  trading_style TEXT CHECK (trading_style IN ('scalping', 'day_trading', 'swing', 'position')),
  
  -- Goals
  weekly_goals TEXT,
  monthly_goals TEXT,
  focus_areas JSONB DEFAULT '[]'::jsonb,
  
  -- Rules
  entry_rules JSONB DEFAULT '[]'::jsonb,
  exit_rules JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_trading_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own trading goals" ON user_trading_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own trading goals" ON user_trading_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trading goals" ON user_trading_goals
  FOR UPDATE USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_user_trading_goals_updated_at
  BEFORE UPDATE ON user_trading_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

