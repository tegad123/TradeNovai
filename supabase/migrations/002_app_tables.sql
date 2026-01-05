-- TradeNova App Tables Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- TRADES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL DEFAULT 'default',
  broker TEXT,
  symbol TEXT NOT NULL,
  product TEXT,
  description TEXT,
  side TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),
  quantity DECIMAL NOT NULL,
  entry_price DECIMAL NOT NULL,
  exit_price DECIMAL,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ,
  pnl DECIMAL,
  pnl_points DECIMAL,
  fees DECIMAL DEFAULT 0,
  commissions DECIMAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  instrument_type TEXT DEFAULT 'future' CHECK (instrument_type IN ('stock', 'option', 'future', 'forex', 'crypto', 'cfd')),
  currency TEXT DEFAULT 'USD',
  open_execution_id TEXT,
  close_execution_id TEXT,
  strategy_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_account ON trades(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON trades(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

-- RLS Policies
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON trades
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- EXECUTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL DEFAULT 'default',
  broker TEXT,
  external_id TEXT,
  symbol TEXT NOT NULL,
  product TEXT,
  description TEXT,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint for deduplication
  UNIQUE(user_id, external_id, executed_at, symbol, side, quantity, price)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON executions(executed_at DESC);

-- RLS Policies
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own executions" ON executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions" ON executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own executions" ON executions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- STRATEGIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#ff9500',
  icon TEXT,
  photo_url TEXT,
  rule_groups JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);

-- RLS Policies
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strategies" ON strategies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies" ON strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies" ON strategies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies" ON strategies
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- DASHBOARD LAYOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  version INTEGER DEFAULT 1,
  layout_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON dashboard_layouts(user_id);

-- RLS Policies
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dashboard layout" ON dashboard_layouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dashboard layout" ON dashboard_layouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dashboard layout" ON dashboard_layouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dashboard layout" ON dashboard_layouts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategies_updated_at
  BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_layouts_updated_at
  BEFORE UPDATE ON dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

