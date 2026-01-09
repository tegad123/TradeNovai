import { openai } from "@ai-sdk/openai"
import { streamText, convertToCoreMessages, type CoreMessage } from "ai"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { 
  TRADE_ANALYZER_SYSTEM_PROMPT,
  formatJournalEntriesForContext,
  parseActionsFromResponse
} from '@/lib/ai/tradeAnalyzerPrompt'
import { getTradeContext, formatTradeContextForAI } from '@/lib/ai/tradeContext'

// Use Node.js runtime for Supabase access
export const runtime = "nodejs"

// Check if OpenAI API key is configured
const hasOpenAIKey = !!process.env.OPENAI_API_KEY

// Create Supabase client for server
async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

// Fetch additional context (journal entries and goals) for AI
async function getAdditionalContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string> {
  let output = ''
  
  // Fetch recent journal entries (table may not exist)
  try {
    const { data: journalEntries, error } = await supabase
      .from('journal_entries')
      .select('id, content, created_at, emotion, tags')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!error && journalEntries && journalEntries.length > 0) {
      const formatted = journalEntries.map(e => ({
        id: e.id,
        content: e.content,
        createdAt: e.created_at,
        emotion: e.emotion ?? undefined,
        tags: e.tags ?? undefined
      }))
      output += `\n### Recent Journal Entries:\n${formatJournalEntriesForContext(formatted)}\n`
    }
  } catch {
    // Table may not exist yet, that's okay
  }
  
  // Fetch trading goals (table may not exist)
  try {
    const { data: goals, error } = await supabase
      .from('user_trading_goals')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (!error && goals) {
      const goalParts: string[] = []
      if (goals.max_risk_per_trade) goalParts.push(`Max risk per trade: $${goals.max_risk_per_trade}`)
      if (goals.max_daily_loss) goalParts.push(`Max daily loss: $${goals.max_daily_loss}`)
      if (goals.daily_profit_target) goalParts.push(`Daily profit target: $${goals.daily_profit_target}`)
      if (goals.weekly_goals) goalParts.push(`Weekly goals: ${goals.weekly_goals}`)
      if (goals.focus_areas?.length) goalParts.push(`Focus areas: ${goals.focus_areas.join(', ')}`)
      if (goals.entry_rules?.length) goalParts.push(`Entry rules: ${goals.entry_rules.join('; ')}`)
      if (goals.exit_rules?.length) goalParts.push(`Exit rules: ${goals.exit_rules.join('; ')}`)
      
      if (goalParts.length > 0) {
        output += `\n### Trading Goals & Rules:\n${goalParts.join('\n')}\n`
      }
    }
  } catch {
    // Table may not exist yet, that's okay
  }
  
  return output
}

export async function POST(req: Request) {
  try {
    // Check for OpenAI API key first
    if (!hasOpenAIKey) {
      console.error('Trade analyzer error: OPENAI_API_KEY is not configured')
      return new Response(JSON.stringify({ 
        error: 'AI chat is not configured. Please add OPENAI_API_KEY to environment variables.' 
      }), { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { messages, includeContext = true } = await req.json()
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Please sign in to use the AI chat.' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Build system prompt with comprehensive trade context
    let systemPrompt = TRADE_ANALYZER_SYSTEM_PROMPT
    
    if (includeContext) {
      try {
        // Get comprehensive trade context
        const tradeContext = await getTradeContext(supabase, user.id, { limit: 50 })
        const tradeContextFormatted = formatTradeContextForAI(tradeContext)
        
        // Also get journal entries and goals for additional context
        const additionalContext = await getAdditionalContext(supabase, user.id)
        
        systemPrompt = `${TRADE_ANALYZER_SYSTEM_PROMPT}\n\n${tradeContextFormatted}\n\n${additionalContext}`
      } catch (contextError) {
        // Log the error but continue without context - tables may not exist yet
        console.warn('Failed to load user context, continuing without:', contextError)
      }
    }

    // Convert messages
    const coreMessages = convertToCoreMessages(messages)

    // Stream the response
    const result = await streamText({
      model: openai("gpt-4o"),
      messages: coreMessages as CoreMessage[],
      system: systemPrompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Trade analyzer error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ 
      error: `AI chat error: ${errorMessage}` 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Execute AI actions endpoint
export async function PUT(req: Request) {
  try {
    const { action } = await req.json()
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse and validate action
    const parsedAction = typeof action === 'string' 
      ? parseActionsFromResponse(action).actions[0]
      : action

    if (!parsedAction || !parsedAction.type) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Execute based on action type
    let result: { success: boolean; data?: unknown; error?: string }

    switch (parsedAction.type) {
      case 'create_journal_entry': {
        const data = parsedAction.data as {
          content: string
          tradeId?: string
          emotion?: string
          mistakes?: string[]
          rulesFollowed?: string[]
          tags?: string[]
        }
        
        const { data: entry, error } = await supabase
          .from('journal_entries')
          .insert({
            user_id: user.id,
            trade_id: data.tradeId || null,
            content: data.content,
            emotion: data.emotion || null,
            mistakes: data.mistakes || [],
            rules_followed: data.rulesFollowed || [],
            tags: data.tags || []
          })
          .select()
          .single()
        
        result = error 
          ? { success: false, error: error.message }
          : { success: true, data: entry }
        break
      }

      case 'create_trade': {
        const data = parsedAction.data as {
          symbol: string
          side: string
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
            user_id: user.id,
            symbol: data.symbol,
            side: data.side,
            entry_price: data.entryPrice,
            exit_price: data.exitPrice,
            quantity: data.quantity || 1,
            pnl: data.pnl,
            closed_at: data.tradeDate,
            status: 'closed',
            notes: data.notes
          })
          .select()
          .single()
        
        result = error 
          ? { success: false, error: error.message }
          : { success: true, data: trade }
        break
      }

      case 'link_journal_to_trade': {
        const data = parsedAction.data as {
          journalEntryId: string
          tradeId: string
        }
        
        const { error } = await supabase
          .from('journal_entries')
          .update({ trade_id: data.tradeId })
          .eq('id', data.journalEntryId)
          .eq('user_id', user.id)
        
        result = error 
          ? { success: false, error: error.message }
          : { success: true }
        break
      }

      case 'update_trade': {
        const data = parsedAction.data as {
          tradeId: string
          notes?: string
        }
        
        const { error } = await supabase
          .from('trades')
          .update({ notes: data.notes })
          .eq('id', data.tradeId)
          .eq('user_id', user.id)
        
        result = error 
          ? { success: false, error: error.message }
          : { success: true }
        break
      }

      default:
        result = { success: false, error: `Unknown action type: ${parsedAction.type}` }
    }

    // Save action to chat history
    if (result.success) {
      await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          role: 'system',
          content: `Action executed: ${parsedAction.type}`,
          actions_executed: [{ type: parsedAction.type, success: true, data: result.data }]
        })
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Action execution error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

