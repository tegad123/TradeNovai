"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import {
  Strategy,
  CreateStrategyPayload,
} from "../types/strategy"
import {
  listStrategies,
  createStrategy,
  updateStrategy,
  deleteStrategy,
} from "../supabase/strategyUtils"

// LocalStorage key for strategies (fallback for unauthenticated users)
const LOCAL_STORAGE_KEY = "tradenova-strategies"

export function useStrategies() {
  const { user, loading: authLoading } = useSupabaseAuthContext()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const hasInitialized = useRef(false)

  // Load strategies
  const loadStrategies = useCallback(async () => {
    // Prevent multiple loads
    if (typeof window === "undefined") return

    setLoading(true)

    try {
      if (user) {
        // Load from Firestore
        const userStrategies = await listStrategies(user.id)
        setStrategies(userStrategies)
      } else {
        // Load from localStorage
        try {
          const localData = localStorage.getItem(LOCAL_STORAGE_KEY)
          if (localData) {
            setStrategies(JSON.parse(localData))
          } else {
            setStrategies([])
          }
        } catch (e) {
          console.error("Failed to load local strategies:", e)
          setStrategies([])
        }
      }
    } catch (error) {
      console.error("Failed to load strategies:", error)
      setStrategies([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Wait for auth to finish loading, then load strategies once
    if (authLoading) return
    
    // Only initialize once per auth state
    if (hasInitialized.current && !user) return
    
    hasInitialized.current = true
    loadStrategies()
  }, [authLoading, user, loadStrategies])

  // Create a new strategy
  const create = useCallback(
    async (payload: CreateStrategyPayload): Promise<Strategy | null> => {
      setSaving(true)

      let newStrategy: Strategy | null = null

      if (user) {
        // Save to Firestore
        newStrategy = await createStrategy(user.id, payload)
      } else {
        // Save to localStorage
        try {
          const id = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const now = new Date().toISOString()

          newStrategy = {
            id,
            userId: "local",
            name: payload.name,
            description: payload.description,
            color: payload.color,
            icon: payload.icon,
            photoUrl: payload.photoUrl,
            ruleGroups: payload.ruleGroups.map((group, gi) => ({
              id: `group-${gi}-${Date.now()}`,
              title: group.title,
              order: gi,
              rules: group.rules.map((rule, ri) => ({
                id: `rule-${gi}-${ri}-${Date.now()}`,
                text: rule.text,
                condition: rule.condition,
                order: ri,
              })),
            })),
            createdAt: now,
            updatedAt: now,
          }

          const updatedStrategies = [newStrategy, ...strategies]
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedStrategies))
        } catch (e) {
          console.error("Failed to save local strategy:", e)
          newStrategy = null
        }
      }

      if (newStrategy) {
        setStrategies((prev) => [newStrategy!, ...prev])
      }

      setSaving(false)
      return newStrategy
    },
    [user, strategies]
  )

  // Update a strategy
  const update = useCallback(
    async (
      strategyId: string,
      payload: Partial<CreateStrategyPayload>
    ): Promise<boolean> => {
      setSaving(true)

      let success = false

      if (user) {
        success = await updateStrategy(user.id, strategyId, payload)
      } else {
        try {
          const updatedStrategies = strategies.map((s) => {
            if (s.id === strategyId) {
              // Extract ruleGroups separately to handle conversion
              const { ruleGroups: payloadRuleGroups, ...restPayload } = payload
              
              const updated: Strategy = {
                ...s,
                ...restPayload,
                updatedAt: new Date().toISOString(),
              }
              
              // Convert ruleGroups to full StrategyRuleGroup with IDs
              if (payloadRuleGroups) {
                updated.ruleGroups = payloadRuleGroups.map((group, gi) => ({
                  id: `group-${Date.now()}-${gi}`,
                  title: group.title,
                  order: gi,
                  rules: group.rules.map((rule, ri) => ({
                    id: `rule-${Date.now()}-${gi}-${ri}`,
                    text: rule.text,
                    condition: rule.condition,
                    order: ri,
                  })),
                }))
              }
              return updated
            }
            return s
          })
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedStrategies))
          setStrategies(updatedStrategies)
          success = true
        } catch (e) {
          console.error("Failed to update local strategy:", e)
        }
      }

      if (success) {
        await loadStrategies()
      }

      setSaving(false)
      return success
    },
    [user, strategies, loadStrategies]
  )

  // Delete a strategy
  const remove = useCallback(
    async (strategyId: string): Promise<boolean> => {
      setSaving(true)

      let success = false

      if (user) {
        success = await deleteStrategy(user.id, strategyId)
      } else {
        try {
          const updatedStrategies = strategies.filter((s) => s.id !== strategyId)
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedStrategies))
          success = true
        } catch (e) {
          console.error("Failed to delete local strategy:", e)
        }
      }

      if (success) {
        setStrategies((prev) => prev.filter((s) => s.id !== strategyId))
      }

      setSaving(false)
      return success
    },
    [user, strategies]
  )

  return {
    strategies,
    loading,
    saving,
    create,
    update,
    remove,
    refresh: loadStrategies,
  }
}

