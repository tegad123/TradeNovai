// Strategy / Playbook types

export type RuleCondition = "always" | "sometimes" | "never"

export interface StrategyRule {
  id: string
  text: string
  condition: RuleCondition
  order: number
}

export interface StrategyRuleGroup {
  id: string
  title: string
  order: number
  rules: StrategyRule[]
}

export interface Strategy {
  id: string
  userId: string
  name: string
  description: string
  color: string
  icon?: string
  photoUrl?: string
  ruleGroups: StrategyRuleGroup[]
  createdAt: string
  updatedAt: string
  // Stats (computed, not stored)
  stats?: {
    totalTrades: number
    winRate: number
    profitFactor: number
    totalPnL: number
    avgWinner: number
    avgLoser: number
  }
}

// For creating rules without ID
export interface CreateStrategyRule {
  text: string
  condition: RuleCondition
  order: number
}

// For creating rule groups without ID
export interface CreateStrategyRuleGroup {
  title: string
  order: number
  rules: CreateStrategyRule[]
}

export interface CreateStrategyPayload {
  name: string
  description: string
  color: string
  icon?: string
  photoUrl?: string
  ruleGroups: CreateStrategyRuleGroup[]
}

export interface UpdateStrategyPayload extends Partial<CreateStrategyPayload> {
  id: string
}

// Color options for strategy
export const STRATEGY_COLORS = [
  { value: "#ff9500", label: "Orange" },
  { value: "#10b981", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#ef4444", label: "Red" },
]

// Icon options for strategy
export const STRATEGY_ICONS = [
  { value: "🎯", label: "Target" },
  { value: "📈", label: "Chart Up" },
  { value: "💎", label: "Diamond" },
  { value: "🚀", label: "Rocket" },
  { value: "⚡", label: "Lightning" },
  { value: "🔥", label: "Fire" },
  { value: "💰", label: "Money" },
  { value: "🏆", label: "Trophy" },
]

// Condition options
export const RULE_CONDITIONS: { value: RuleCondition; label: string }[] = [
  { value: "always", label: "Always" },
  { value: "sometimes", label: "Sometimes" },
  { value: "never", label: "Never" },
]

