// Strategy Supabase utilities

import { createClientSafe } from "./browser"
import {
  Strategy,
  CreateStrategyPayload,
  StrategyRuleGroup,
} from "@/lib/types/strategy"

// Generate unique ID for rule groups and rules
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// List all strategies for a user
export async function listStrategies(userId: string): Promise<Strategy[]> {
  const supabase = createClientSafe()
  if (!supabase) {
    console.error("Supabase is not configured")
    return []
  }

  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error listing strategies:", error)
    return []
  }

  // Map from snake_case to camelCase
  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || "",
    color: row.color || "#ff9500",
    icon: row.icon,
    photoUrl: row.photo_url,
    ruleGroups: (row.rule_groups || []) as StrategyRuleGroup[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

// Get a single strategy by ID
export async function getStrategy(
  userId: string,
  strategyId: string
): Promise<Strategy | null> {
  const supabase = createClientSafe()
  if (!supabase) {
    console.error("Supabase is not configured")
    return null
  }

  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("id", strategyId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.error("Error getting strategy:", error)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description || "",
    color: data.color || "#ff9500",
    icon: data.icon,
    photoUrl: data.photo_url,
    ruleGroups: (data.rule_groups || []) as StrategyRuleGroup[],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

// Create a new strategy
export async function createStrategy(
  userId: string,
  payload: CreateStrategyPayload
): Promise<Strategy | null> {
  const supabase = createClientSafe()
  if (!supabase) {
    console.error("Supabase is not configured")
    return null
  }

  // Convert rule groups to include IDs
  const ruleGroups: StrategyRuleGroup[] = payload.ruleGroups.map(
    (group, groupIndex) => ({
      id: generateId(),
      title: group.title,
      order: groupIndex,
      rules: group.rules.map((rule, ruleIndex) => ({
        id: generateId(),
        text: rule.text,
        condition: rule.condition,
        order: ruleIndex,
      })),
    })
  )

  const { data, error } = await supabase
    .from("strategies")
    .insert({
      user_id: userId,
      name: payload.name,
      description: payload.description,
      color: payload.color,
      icon: payload.icon,
      photo_url: payload.photoUrl,
      rule_groups: ruleGroups,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating strategy:", error)
    return null
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description || "",
    color: data.color || "#ff9500",
    icon: data.icon,
    photoUrl: data.photo_url,
    ruleGroups: (data.rule_groups || []) as StrategyRuleGroup[],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

// Update a strategy
export async function updateStrategy(
  userId: string,
  strategyId: string,
  payload: Partial<CreateStrategyPayload>
): Promise<boolean> {
  const supabase = createClientSafe()
  if (!supabase) {
    console.error("Supabase is not configured")
    return false
  }

  // Build update object
  const updateData: Record<string, unknown> = {}

  if (payload.name !== undefined) updateData.name = payload.name
  if (payload.description !== undefined) updateData.description = payload.description
  if (payload.color !== undefined) updateData.color = payload.color
  if (payload.icon !== undefined) updateData.icon = payload.icon
  if (payload.photoUrl !== undefined) updateData.photo_url = payload.photoUrl

  // Convert rule groups to include IDs
  if (payload.ruleGroups !== undefined) {
    updateData.rule_groups = payload.ruleGroups.map((group, groupIndex) => ({
      id: generateId(),
      title: group.title,
      order: groupIndex,
      rules: group.rules.map((rule, ruleIndex) => ({
        id: generateId(),
        text: rule.text,
        condition: rule.condition,
        order: ruleIndex,
      })),
    }))
  }

  const { error } = await supabase
    .from("strategies")
    .update(updateData)
    .eq("id", strategyId)
    .eq("user_id", userId)

  if (error) {
    console.error("Error updating strategy:", error)
    return false
  }

  return true
}

// Delete a strategy
export async function deleteStrategy(
  userId: string,
  strategyId: string
): Promise<boolean> {
  const supabase = createClientSafe()
  if (!supabase) {
    console.error("Supabase is not configured")
    return false
  }

  const { error } = await supabase
    .from("strategies")
    .delete()
    .eq("id", strategyId)
    .eq("user_id", userId)

  if (error) {
    console.error("Error deleting strategy:", error)
    return false
  }

  return true
}

