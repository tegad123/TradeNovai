// Strategy Firebase utilities

import { db } from "./firebase"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore"
import {
  Strategy,
  CreateStrategyPayload,
  UpdateStrategyPayload,
  StrategyRuleGroup,
} from "../types/strategy"

const STRATEGIES_COLLECTION = "strategies"

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// List all strategies for a user
export async function listStrategies(userId: string): Promise<Strategy[]> {
  if (!db) {
    console.error("Firestore is not initialized.")
    return []
  }

  try {
    const strategiesRef = collection(db, STRATEGIES_COLLECTION)
    const q = query(
      strategiesRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    )
    const querySnapshot = await getDocs(q)

    const strategies: Strategy[] = []
    querySnapshot.forEach((doc) => {
      strategies.push({ id: doc.id, ...doc.data() } as Strategy)
    })

    return strategies
  } catch (error) {
    console.error("Error listing strategies:", error)
    return []
  }
}

// Get a single strategy by ID
export async function getStrategy(
  userId: string,
  strategyId: string
): Promise<Strategy | null> {
  if (!db) {
    console.error("Firestore is not initialized.")
    return null
  }

  try {
    const docRef = doc(db, STRATEGIES_COLLECTION, strategyId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as Strategy
      // Verify ownership
      if (data.userId !== userId) {
        console.error("Strategy does not belong to user")
        return null
      }
      return { id: docSnap.id, ...data }
    }
    return null
  } catch (error) {
    console.error("Error getting strategy:", error)
    return null
  }
}

// Create a new strategy
export async function createStrategy(
  userId: string,
  payload: CreateStrategyPayload
): Promise<Strategy | null> {
  if (!db) {
    console.error("Firestore is not initialized.")
    return null
  }

  try {
    const strategyId = generateId()
    const now = new Date().toISOString()

    // Add IDs to rule groups and rules
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

    const strategy: Strategy = {
      id: strategyId,
      userId,
      name: payload.name,
      description: payload.description,
      color: payload.color,
      icon: payload.icon,
      photoUrl: payload.photoUrl,
      ruleGroups,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = doc(db, STRATEGIES_COLLECTION, strategyId)
    await setDoc(docRef, strategy)

    return strategy
  } catch (error) {
    console.error("Error creating strategy:", error)
    return null
  }
}

// Update a strategy
export async function updateStrategy(
  userId: string,
  strategyId: string,
  payload: Partial<CreateStrategyPayload>
): Promise<boolean> {
  if (!db) {
    console.error("Firestore is not initialized.")
    return false
  }

  try {
    // Verify ownership first
    const existing = await getStrategy(userId, strategyId)
    if (!existing) {
      console.error("Strategy not found or not owned by user")
      return false
    }

    const updateData: Record<string, unknown> = {
      ...payload,
      updatedAt: new Date().toISOString(),
    }

    // If updating rule groups, add IDs
    if (payload.ruleGroups) {
      updateData.ruleGroups = payload.ruleGroups.map((group, groupIndex) => ({
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

    const docRef = doc(db, STRATEGIES_COLLECTION, strategyId)
    await updateDoc(docRef, updateData)

    return true
  } catch (error) {
    console.error("Error updating strategy:", error)
    return false
  }
}

// Delete a strategy
export async function deleteStrategy(
  userId: string,
  strategyId: string
): Promise<boolean> {
  if (!db) {
    console.error("Firestore is not initialized.")
    return false
  }

  try {
    // Verify ownership first
    const existing = await getStrategy(userId, strategyId)
    if (!existing) {
      console.error("Strategy not found or not owned by user")
      return false
    }

    const docRef = doc(db, STRATEGIES_COLLECTION, strategyId)
    await deleteDoc(docRef)

    return true
  } catch (error) {
    console.error("Error deleting strategy:", error)
    return false
  }
}

