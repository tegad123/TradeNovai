"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "./useAuth"
import { 
  DashboardLayout, 
  DEFAULT_DASHBOARD_LAYOUT,
  DashboardSection 
} from "@/lib/types/dashboardLayout"
import {
  getDashboardLayout,
  saveDashboardLayout,
  resetDashboardLayout,
} from "@/lib/firebase/dashboardLayoutUtils"

const LOCAL_STORAGE_KEY = "dashboard-layout"

// Local storage helpers
function getLocalLayout(): DashboardLayout | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as DashboardLayout
    }
  } catch (e) {
    console.error("Error reading layout from localStorage:", e)
  }
  return null
}

function saveLocalLayout(layout: DashboardLayout): boolean {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layout))
    return true
  } catch (e) {
    console.error("Error saving layout to localStorage:", e)
    return false
  }
}

function clearLocalLayout(): boolean {
  if (typeof window === "undefined") return false
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    return true
  } catch (e) {
    console.error("Error clearing layout from localStorage:", e)
    return false
  }
}

export function useDashboardLayout() {
  const { user, loading: authLoading } = useAuth()
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_DASHBOARD_LAYOUT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load layout on mount / user change
  useEffect(() => {
    async function loadLayout() {
      // Wait for auth to finish loading
      if (authLoading) return

      setLoading(true)

      if (user) {
        // User is logged in - try Firestore first
        const savedLayout = await getDashboardLayout(user.uid)
        setLayout(savedLayout)
      } else {
        // No user - use localStorage
        const localLayout = getLocalLayout()
        if (localLayout) {
          setLayout(localLayout)
        } else {
          setLayout(DEFAULT_DASHBOARD_LAYOUT)
        }
      }

      setLoading(false)
    }

    loadLayout()
  }, [user, authLoading])

  // Save layout
  const saveLayout = useCallback(async (newLayout: DashboardLayout): Promise<boolean> => {
    // Update layout immediately for responsive UI
    setLayout(newLayout)
    setSaving(true)
    
    let success = false
    
    if (user) {
      // User is logged in - save to Firestore
      success = await saveDashboardLayout(user.uid, newLayout)
    } else {
      // No user - save to localStorage
      success = saveLocalLayout(newLayout)
    }

    if (!success) {
      console.error("Failed to persist layout to storage")
    }

    setSaving(false)
    return success
  }, [user])

  // Reset to default
  const resetLayout = useCallback(async (): Promise<boolean> => {
    // Update layout immediately for responsive UI
    setLayout(DEFAULT_DASHBOARD_LAYOUT)
    setSaving(true)
    
    let success = false

    if (user) {
      // User is logged in - delete from Firestore
      success = await resetDashboardLayout(user.uid)
    } else {
      // No user - clear localStorage
      success = clearLocalLayout()
    }

    if (!success) {
      console.error("Failed to reset layout in storage")
    }

    setSaving(false)
    return success
  }, [user])

  // Update KPIs
  const updateKpis = useCallback((kpis: string[]) => {
    const newLayout = { ...layout, kpis }
    setLayout(newLayout)
    return newLayout
  }, [layout])

  // Toggle section
  const toggleSection = useCallback((sectionId: string) => {
    const newSections = layout.sections.map(section =>
      section.id === sectionId
        ? { ...section, enabled: !section.enabled }
        : section
    )
    const newLayout = { ...layout, sections: newSections }
    setLayout(newLayout)
    return newLayout
  }, [layout])

  // Reorder sections
  const reorderSections = useCallback((sections: DashboardSection[]) => {
    const newLayout = { ...layout, sections }
    setLayout(newLayout)
    return newLayout
  }, [layout])

  // Check if section is enabled
  const isSectionEnabled = useCallback((sectionId: string) => {
    const section = layout.sections.find(s => s.id === sectionId)
    return section?.enabled ?? true
  }, [layout])

  // Get ordered sections
  const getOrderedSections = useCallback(() => {
    return layout.sections.filter(s => s.enabled)
  }, [layout])

  return {
    layout,
    loading: loading || authLoading,
    saving,
    saveLayout,
    resetLayout,
    updateKpis,
    toggleSection,
    reorderSections,
    isSectionEnabled,
    getOrderedSections,
  }
}
