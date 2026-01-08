// Journal and AI Chat Database Utilities

import { createClientSafe } from './browser'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================
// Types
// ============================================

export type EmotionType = 
  | 'confident' 
  | 'fearful' 
  | 'greedy' 
  | 'patient' 
  | 'impatient' 
  | 'neutral'
  | 'frustrated'
  | 'excited'
  | 'anxious'
  | 'calm'

export interface JournalEntry {
  id: string
  user_id: string
  trade_id: string | null
  content: string
  emotion: EmotionType | null
  mistakes: string[]
  rules_followed: string[]
  tags: string[]
  ai_summary: string | null
  ai_action_items: string[]
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  related_trade_ids: string[]
  related_journal_ids: string[]
  actions_executed: Array<{ type: string; success: boolean; data?: unknown }>
  created_at: string
}

export interface UserTradingGoals {
  id: string
  user_id: string
  max_risk_per_trade: number | null
  max_daily_loss: number | null
  daily_profit_target: number | null
  max_trades_per_day: number | null
  preferred_instruments: string[]
  trading_style: 'scalping' | 'day_trading' | 'swing' | 'position' | null
  weekly_goals: string | null
  monthly_goals: string | null
  focus_areas: string[]
  entry_rules: string[]
  exit_rules: string[]
  created_at: string
  updated_at: string
}

export interface TradeForContext {
  id: string
  symbol: string
  side: string
  entryPrice: number
  exitPrice: number
  pnl: number
  tradeDate: string
  notes?: string
}

// ============================================
// Helper
// ============================================

function getClient(): SupabaseClient | null {
  return createClientSafe()
}

// ============================================
// Journal Entry Operations
// ============================================

export async function createJournalEntry(
  userId: string,
  data: {
    content: string
    tradeId?: string
    emotion?: EmotionType
    mistakes?: string[]
    rulesFollowed?: string[]
    tags?: string[]
    aiSummary?: string
    aiActionItems?: string[]
  }
): Promise<JournalEntry | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      trade_id: data.tradeId || null,
      content: data.content,
      emotion: data.emotion || null,
      mistakes: data.mistakes || [],
      rules_followed: data.rulesFollowed || [],
      tags: data.tags || [],
      ai_summary: data.aiSummary || null,
      ai_action_items: data.aiActionItems || []
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating journal entry:', error)
    return null
  }

  return entry
}

export async function getJournalEntries(
  userId: string,
  limit: number = 10
): Promise<JournalEntry[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching journal entries:', error)
    return []
  }

  return data || []
}

export async function getJournalEntriesForTrade(
  tradeId: string
): Promise<JournalEntry[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('trade_id', tradeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching journal entries for trade:', error)
    return []
  }

  return data || []
}

export async function updateJournalEntry(
  entryId: string,
  userId: string,
  data: Partial<{
    content: string
    tradeId: string | null
    emotion: EmotionType | null
    mistakes: string[]
    rulesFollowed: string[]
    tags: string[]
    aiSummary: string
    aiActionItems: string[]
  }>
): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const updateData: Record<string, unknown> = {}
  if (data.content !== undefined) updateData.content = data.content
  if (data.tradeId !== undefined) updateData.trade_id = data.tradeId
  if (data.emotion !== undefined) updateData.emotion = data.emotion
  if (data.mistakes !== undefined) updateData.mistakes = data.mistakes
  if (data.rulesFollowed !== undefined) updateData.rules_followed = data.rulesFollowed
  if (data.tags !== undefined) updateData.tags = data.tags
  if (data.aiSummary !== undefined) updateData.ai_summary = data.aiSummary
  if (data.aiActionItems !== undefined) updateData.ai_action_items = data.aiActionItems

  const { error } = await supabase
    .from('journal_entries')
    .update(updateData)
    .eq('id', entryId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating journal entry:', error)
    return false
  }

  return true
}

export async function linkJournalToTrade(
  entryId: string,
  tradeId: string,
  userId: string
): Promise<boolean> {
  return updateJournalEntry(entryId, userId, { tradeId })
}

// ============================================
// Chat Message Operations
// ============================================

export async function saveChatMessage(
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  options?: {
    relatedTradeIds?: string[]
    relatedJournalIds?: string[]
    actionsExecuted?: Array<{ type: string; success: boolean; data?: unknown }>
  }
): Promise<ChatMessage | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: userId,
      role,
      content,
      related_trade_ids: options?.relatedTradeIds || [],
      related_journal_ids: options?.relatedJournalIds || [],
      actions_executed: options?.actionsExecuted || []
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving chat message:', error)
    return null
  }

  return data
}

export async function getChatHistory(
  userId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching chat history:', error)
    return []
  }

  return data || []
}

export async function clearChatHistory(userId: string): Promise<boolean> {
  const supabase = getClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Error clearing chat history:', error)
    return false
  }

  return true
}

// ============================================
// User Trading Goals Operations
// ============================================

export async function getUserTradingGoals(
  userId: string
): Promise<UserTradingGoals | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('user_trading_goals')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // Not found is OK
    console.error('Error fetching trading goals:', error)
    return null
  }

  return data
}

export async function upsertUserTradingGoals(
  userId: string,
  goals: Partial<{
    maxRiskPerTrade: number
    maxDailyLoss: number
    dailyProfitTarget: number
    maxTradesPerDay: number
    preferredInstruments: string[]
    tradingStyle: 'scalping' | 'day_trading' | 'swing' | 'position'
    weeklyGoals: string
    monthlyGoals: string
    focusAreas: string[]
    entryRules: string[]
    exitRules: string[]
  }>
): Promise<UserTradingGoals | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('user_trading_goals')
    .upsert({
      user_id: userId,
      max_risk_per_trade: goals.maxRiskPerTrade,
      max_daily_loss: goals.maxDailyLoss,
      daily_profit_target: goals.dailyProfitTarget,
      max_trades_per_day: goals.maxTradesPerDay,
      preferred_instruments: goals.preferredInstruments,
      trading_style: goals.tradingStyle,
      weekly_goals: goals.weeklyGoals,
      monthly_goals: goals.monthlyGoals,
      focus_areas: goals.focusAreas,
      entry_rules: goals.entryRules,
      exit_rules: goals.exitRules
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single()

  if (error) {
    console.error('Error upserting trading goals:', error)
    return null
  }

  return data
}

// ============================================
// Trade Context Operations
// ============================================

export async function getRecentTradesForContext(
  userId: string,
  limit: number = 10
): Promise<TradeForContext[]> {
  const supabase = getClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('trades')
    .select('id, symbol, side, entry_price, exit_price, pnl, closed_at, notes')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching trades for context:', error)
    return []
  }

  return (data || []).map(t => ({
    id: t.id,
    symbol: t.symbol,
    side: t.side,
    entryPrice: t.entry_price,
    exitPrice: t.exit_price,
    pnl: t.pnl,
    tradeDate: t.closed_at ? new Date(t.closed_at).toISOString().split('T')[0] : '',
    notes: t.notes
  }))
}

export async function getMostRecentTrade(
  userId: string
): Promise<TradeForContext | null> {
  const trades = await getRecentTradesForContext(userId, 1)
  return trades[0] || null
}

// ============================================
// AI Action Executor
// ============================================

export async function executeAIAction(
  userId: string,
  action: { type: string; data: Record<string, unknown> }
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const supabase = getClient()
  if (!supabase) return { success: false, error: 'Database not available' }

  try {
    switch (action.type) {
      case 'create_journal_entry': {
        const data = action.data as {
          content: string
          tradeId?: string
          emotion?: EmotionType
          mistakes?: string[]
          rulesFollowed?: string[]
          tags?: string[]
        }
        
        const entry = await createJournalEntry(userId, {
          content: data.content,
          tradeId: data.tradeId,
          emotion: data.emotion,
          mistakes: data.mistakes,
          rulesFollowed: data.rulesFollowed,
          tags: data.tags
        })
        
        if (!entry) {
          return { success: false, error: 'Failed to create journal entry' }
        }
        
        return { success: true, result: entry }
      }

      case 'create_trade': {
        const data = action.data as {
          symbol: string
          side: 'long' | 'short'
          entryPrice: number
          exitPrice: number
          quantity: number
          pnl: number
          tradeDate: string
          notes?: string
        }
        
        const { data: trade, error } = await supabase
          .from('trades')
          .insert({
            user_id: userId,
            symbol: data.symbol,
            side: data.side,
            entry_price: data.entryPrice,
            exit_price: data.exitPrice,
            quantity: data.quantity,
            pnl: data.pnl,
            closed_at: data.tradeDate,
            status: 'closed',
            notes: data.notes
          })
          .select()
          .single()
        
        if (error) {
          return { success: false, error: error.message }
        }
        
        return { success: true, result: trade }
      }

      case 'link_journal_to_trade': {
        const data = action.data as {
          journalEntryId: string
          tradeId: string
        }
        
        const success = await linkJournalToTrade(
          data.journalEntryId,
          data.tradeId,
          userId
        )
        
        if (!success) {
          return { success: false, error: 'Failed to link journal to trade' }
        }
        
        return { success: true }
      }

      case 'update_trade': {
        const data = action.data as {
          tradeId: string
          notes?: string
        }
        
        const { error } = await supabase
          .from('trades')
          .update({ notes: data.notes })
          .eq('id', data.tradeId)
          .eq('user_id', userId)
        
        if (error) {
          return { success: false, error: error.message }
        }
        
        return { success: true }
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` }
    }
  } catch (error) {
    console.error('Error executing AI action:', error)
    return { success: false, error: String(error) }
  }
}

// ============================================
// Context Builder for AI
// ============================================

export async function buildAIContext(userId: string): Promise<{
  trades: TradeForContext[]
  journalEntries: JournalEntry[]
  goals: UserTradingGoals | null
}> {
  const [trades, journalEntries, goals] = await Promise.all([
    getRecentTradesForContext(userId, 10),
    getJournalEntries(userId, 5),
    getUserTradingGoals(userId)
  ])

  return { trades, journalEntries, goals }
}

