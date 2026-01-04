"use client"

import { useState, useCallback } from "react"
import { Plus, X, GripVertical, ChevronUp, ChevronDown, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  StrategyRuleGroup,
  StrategyRule,
  RuleCondition,
  RULE_CONDITIONS,
} from "@/lib/types/strategy"

interface RulesBuilderProps {
  ruleGroups: StrategyRuleGroup[]
  onChange: (groups: StrategyRuleGroup[]) => void
  className?: string
}

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function RulesBuilder({ ruleGroups, onChange, className }: RulesBuilderProps) {
  // Add a new rule group
  const addRuleGroup = useCallback(() => {
    const newGroup: StrategyRuleGroup = {
      id: generateId(),
      title: "",
      order: ruleGroups.length,
      rules: [
        {
          id: generateId(),
          text: "",
          condition: "always",
          order: 0,
        },
      ],
    }
    onChange([...ruleGroups, newGroup])
  }, [ruleGroups, onChange])

  // Remove a rule group
  const removeRuleGroup = useCallback(
    (groupId: string) => {
      onChange(ruleGroups.filter((g) => g.id !== groupId))
    },
    [ruleGroups, onChange]
  )

  // Update a rule group title
  const updateGroupTitle = useCallback(
    (groupId: string, title: string) => {
      onChange(
        ruleGroups.map((g) => (g.id === groupId ? { ...g, title } : g))
      )
    },
    [ruleGroups, onChange]
  )

  // Move group up
  const moveGroupUp = useCallback(
    (index: number) => {
      if (index === 0) return
      const newGroups = [...ruleGroups]
      const temp = newGroups[index]
      newGroups[index] = newGroups[index - 1]
      newGroups[index - 1] = temp
      onChange(newGroups.map((g, i) => ({ ...g, order: i })))
    },
    [ruleGroups, onChange]
  )

  // Move group down
  const moveGroupDown = useCallback(
    (index: number) => {
      if (index === ruleGroups.length - 1) return
      const newGroups = [...ruleGroups]
      const temp = newGroups[index]
      newGroups[index] = newGroups[index + 1]
      newGroups[index + 1] = temp
      onChange(newGroups.map((g, i) => ({ ...g, order: i })))
    },
    [ruleGroups, onChange]
  )

  // Add a rule to a group
  const addRule = useCallback(
    (groupId: string) => {
      onChange(
        ruleGroups.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              rules: [
                ...g.rules,
                {
                  id: generateId(),
                  text: "",
                  condition: "always" as RuleCondition,
                  order: g.rules.length,
                },
              ],
            }
          }
          return g
        })
      )
    },
    [ruleGroups, onChange]
  )

  // Remove a rule from a group
  const removeRule = useCallback(
    (groupId: string, ruleId: string) => {
      onChange(
        ruleGroups.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              rules: g.rules.filter((r) => r.id !== ruleId),
            }
          }
          return g
        })
      )
    },
    [ruleGroups, onChange]
  )

  // Update a rule
  const updateRule = useCallback(
    (groupId: string, ruleId: string, updates: Partial<StrategyRule>) => {
      onChange(
        ruleGroups.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              rules: g.rules.map((r) =>
                r.id === ruleId ? { ...r, ...updates } : r
              ),
            }
          }
          return g
        })
      )
    },
    [ruleGroups, onChange]
  )

  // Move rule up within group
  const moveRuleUp = useCallback(
    (groupId: string, ruleIndex: number) => {
      if (ruleIndex === 0) return
      onChange(
        ruleGroups.map((g) => {
          if (g.id === groupId) {
            const newRules = [...g.rules]
            const temp = newRules[ruleIndex]
            newRules[ruleIndex] = newRules[ruleIndex - 1]
            newRules[ruleIndex - 1] = temp
            return {
              ...g,
              rules: newRules.map((r, i) => ({ ...r, order: i })),
            }
          }
          return g
        })
      )
    },
    [ruleGroups, onChange]
  )

  // Move rule down within group
  const moveRuleDown = useCallback(
    (groupId: string, ruleIndex: number, rulesLength: number) => {
      if (ruleIndex === rulesLength - 1) return
      onChange(
        ruleGroups.map((g) => {
          if (g.id === groupId) {
            const newRules = [...g.rules]
            const temp = newRules[ruleIndex]
            newRules[ruleIndex] = newRules[ruleIndex + 1]
            newRules[ruleIndex + 1] = temp
            return {
              ...g,
              rules: newRules.map((r, i) => ({ ...r, order: i })),
            }
          }
          return g
        })
      )
    },
    [ruleGroups, onChange]
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Rules</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Define when a trade should match this setup.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#"
            className="text-sm text-[hsl(var(--theme-primary))] hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-4 h-4" />
            How to build it?
          </a>
          <Button variant="glass-theme" size="sm" onClick={addRuleGroup}>
            Add rule group
          </Button>
        </div>
      </div>

      {/* Rule groups */}
      <div className="space-y-3">
        {ruleGroups.map((group, groupIndex) => (
          <div
            key={group.id}
            className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
          >
            {/* Group header */}
            <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-white/5">
              {/* Reorder buttons */}
              <div className="flex flex-col">
                <button
                  onClick={() => moveGroupUp(groupIndex)}
                  disabled={groupIndex === 0}
                  className={cn(
                    "p-0.5 rounded hover:bg-white/10 transition-colors",
                    groupIndex === 0
                      ? "text-[var(--text-muted)]/30 cursor-not-allowed"
                      : "text-[var(--text-muted)] hover:text-white"
                  )}
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveGroupDown(groupIndex)}
                  disabled={groupIndex === ruleGroups.length - 1}
                  className={cn(
                    "p-0.5 rounded hover:bg-white/10 transition-colors",
                    groupIndex === ruleGroups.length - 1
                      ? "text-[var(--text-muted)]/30 cursor-not-allowed"
                      : "text-[var(--text-muted)] hover:text-white"
                  )}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Drag handle (visual only for now) */}
              <GripVertical className="w-4 h-4 text-[var(--text-muted)]" />

              {/* Group title input */}
              <input
                type="text"
                value={group.title}
                onChange={(e) => updateGroupTitle(group.id, e.target.value)}
                placeholder="E.g. Entry criteria"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 text-sm"
              />

              {/* Delete group button */}
              <button
                onClick={() => removeRuleGroup(group.id)}
                className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-[var(--text-muted)] hover:text-red-400"
                title="Delete rule group"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rules */}
            <div className="p-3 space-y-2">
              {group.rules.map((rule, ruleIndex) => (
                <div key={rule.id} className="flex items-center gap-2">
                  {/* Reorder buttons */}
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveRuleUp(group.id, ruleIndex)}
                      disabled={ruleIndex === 0}
                      className={cn(
                        "p-0.5 rounded hover:bg-white/10 transition-colors",
                        ruleIndex === 0
                          ? "text-[var(--text-muted)]/30 cursor-not-allowed"
                          : "text-[var(--text-muted)] hover:text-white"
                      )}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() =>
                        moveRuleDown(group.id, ruleIndex, group.rules.length)
                      }
                      disabled={ruleIndex === group.rules.length - 1}
                      className={cn(
                        "p-0.5 rounded hover:bg-white/10 transition-colors",
                        ruleIndex === group.rules.length - 1
                          ? "text-[var(--text-muted)]/30 cursor-not-allowed"
                          : "text-[var(--text-muted)] hover:text-white"
                      )}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Drag handle */}
                  <GripVertical className="w-4 h-4 text-[var(--text-muted)]" />

                  {/* Rule text input */}
                  <input
                    type="text"
                    value={rule.text}
                    onChange={(e) =>
                      updateRule(group.id, rule.id, { text: e.target.value })
                    }
                    placeholder="(E.g. Trading above VWAP)"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 text-sm"
                  />

                  {/* Condition dropdown */}
                  <select
                    value={rule.condition}
                    onChange={(e) =>
                      updateRule(group.id, rule.id, {
                        condition: e.target.value as RuleCondition,
                      })
                    }
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 text-sm min-w-[120px]"
                  >
                    {RULE_CONDITIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-gray-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Delete rule button */}
                  <button
                    onClick={() => removeRule(group.id, rule.id)}
                    disabled={group.rules.length <= 1}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      group.rules.length <= 1
                        ? "text-[var(--text-muted)]/30 cursor-not-allowed"
                        : "hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400"
                    )}
                    title="Delete rule"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Add rule button */}
              <button
                onClick={() => addRule(group.id)}
                className="flex items-center gap-1.5 text-sm text-[hsl(var(--theme-primary))] hover:text-[hsl(var(--theme-primary))]/80 transition-colors mt-2"
              >
                <Plus className="w-4 h-4" />
                Add rule
              </button>
            </div>
          </div>
        ))}

        {ruleGroups.length === 0 && (
          <div className="rounded-xl bg-white/5 border border-white/10 border-dashed p-8 text-center">
            <p className="text-[var(--text-muted)] mb-3">
              No rule groups yet. Add one to define your strategy criteria.
            </p>
            <Button variant="glass-theme" size="sm" onClick={addRuleGroup}>
              <Plus className="w-4 h-4 mr-2" />
              Add rule group
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

