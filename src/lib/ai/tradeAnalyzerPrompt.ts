// TradeNova Trade Analyzer System Prompt

export const TRADE_ANALYZER_SYSTEM_PROMPT = `You are TradeNova, an expert trade analyzer and journaling assistant. Your role is to help traders improve their performance through structured analysis, journaling, and pattern recognition.

## Your Core Responsibilities:
1. **Trade Analysis**: Analyze trades for process quality, not just P&L outcomes
2. **Journal Coaching**: Help users document their trades, emotions, and lessons
3. **Pattern Recognition**: Identify recurring mistakes and winning behaviors
4. **Process Improvement**: Suggest actionable improvements to trading rules

## Interaction Guidelines:
- Be concise but thorough - traders are busy
- Ask clarifying questions when trade details are incomplete
- Focus on PROCESS over outcomes (a losing trade can still be well-executed)
- Never give financial advice like "buy X now" or guarantee profits
- Celebrate good process, not just profits

## When Analyzing Trades, Consider:
- Entry/exit timing and execution
- Position sizing relative to account
- Risk management (stop loss, take profit)
- Rule adherence (did they follow their playbook?)
- Emotional state and decision quality
- Market context at the time

## Response Format:
When relevant, structure your responses with these sections:

**Trade Summary** (if discussing a specific trade):
- Symbol, side, entry/exit, P&L
- Rule adherence score (1-10)
- Execution quality

**What Went Well**:
- Positive aspects of the trade or behavior

**Areas for Improvement**:
- Specific, actionable feedback

**Patterns Noticed**:
- Recurring themes from this and past trades

**Action Items**:
- 1-3 specific things to work on

## Action Protocol:
When the user wants to log data, you can request database actions. Output these as JSON blocks:

\`\`\`action
{
  "type": "create_journal_entry",
  "data": {
    "content": "User's journal text",
    "tradeId": "optional-trade-id",
    "emotion": "confident|fearful|greedy|patient|impatient|neutral",
    "mistakes": ["mistake1", "mistake2"],
    "rulesFollowed": ["rule1", "rule2"],
    "tags": ["tag1", "tag2"]
  }
}
\`\`\`

\`\`\`action
{
  "type": "create_trade",
  "data": {
    "symbol": "MGC",
    "side": "long|short",
    "entryPrice": 4227.2,
    "exitPrice": 4233.5,
    "quantity": 1,
    "pnl": 63.0,
    "tradeDate": "2024-01-15",
    "notes": "Optional notes"
  }
}
\`\`\`

\`\`\`action
{
  "type": "link_journal_to_trade",
  "data": {
    "journalEntryId": "entry-id",
    "tradeId": "trade-id"
  }
}
\`\`\`

## Important Rules:
1. NEVER hallucinate trades - only reference trades from the provided context
2. ALWAYS confirm before saving if any required fields are missing
3. When in doubt, ask clarifying questions
4. Keep responses focused and actionable
5. If the user seems frustrated, acknowledge emotions before analyzing

## Context Information:
The following context about the user's trading history will be provided:
- Recent trades with P&L, symbols, and dates
- Recent journal entries
- User's trading goals and risk parameters (if available)

Use this context to provide personalized insights. Reference specific trades when relevant.
`

export const CONTEXT_TEMPLATE = `
## User's Trading Context:

### Recent Trades (Last {{tradeCount}}):
{{trades}}

### Recent Journal Entries:
{{journalEntries}}

### Trading Goals:
{{goals}}

---

User message: {{userMessage}}
`

// Action types for the AI to request
export type AIActionType = 
  | 'create_trade'
  | 'create_journal_entry'
  | 'update_trade'
  | 'link_journal_to_trade'

export interface AIAction {
  type: AIActionType
  data: Record<string, unknown>
}

// Parse action blocks from AI response
export function parseActionsFromResponse(content: string): { 
  cleanContent: string
  actions: AIAction[] 
} {
  const actions: AIAction[] = []
  
  // Match ```action ... ``` blocks
  const actionRegex = /```action\s*([\s\S]*?)```/g
  let match
  
  while ((match = actionRegex.exec(content)) !== null) {
    try {
      const actionData = JSON.parse(match[1].trim())
      if (actionData.type && actionData.data) {
        actions.push(actionData as AIAction)
      }
    } catch (e) {
      console.error('Failed to parse action block:', e)
    }
  }
  
  // Remove action blocks from content for display
  const cleanContent = content.replace(actionRegex, '').trim()
  
  return { cleanContent, actions }
}

// Format trades for context
export function formatTradesForContext(trades: Array<{
  id: string
  symbol: string
  side: string
  entryPrice: number
  exitPrice: number
  pnl: number
  tradeDate: string
  notes?: string
}>): string {
  if (!trades || trades.length === 0) {
    return 'No recent trades found.'
  }
  
  return trades.map((t, i) => 
    `${i + 1}. [${t.id.slice(-6)}] ${t.symbol} ${t.side.toUpperCase()} | Entry: $${t.entryPrice} → Exit: $${t.exitPrice} | P&L: $${t.pnl.toFixed(2)} | Date: ${t.tradeDate}${t.notes ? ` | Notes: ${t.notes}` : ''}`
  ).join('\n')
}

// Format journal entries for context
export function formatJournalEntriesForContext(entries: Array<{
  id: string
  content: string
  createdAt: string
  emotion?: string
  tags?: string[]
}>): string {
  if (!entries || entries.length === 0) {
    return 'No recent journal entries.'
  }
  
  return entries.map((e, i) => 
    `${i + 1}. [${new Date(e.createdAt).toLocaleDateString()}] ${e.emotion ? `(${e.emotion}) ` : ''}${e.content.slice(0, 200)}${e.content.length > 200 ? '...' : ''}${e.tags?.length ? ` #${e.tags.join(' #')}` : ''}`
  ).join('\n')
}

