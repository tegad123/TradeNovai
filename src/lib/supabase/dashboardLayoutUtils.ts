// Dashboard Layout Supabase utilities

import { createClientSafe } from "./browser"
import { DashboardLayout, DEFAULT_DASHBOARD_LAYOUT } from "@/lib/types/dashboardLayout"

// Get dashboard layout for a user
export async function getDashboardLayout(
  userId: string
): Promise<DashboardLayout | null> {
  const supabase = createClientSafe()
  if (!supabase) {
    console.error("Supabase is not configured")
    return null
  }

  const { data, error } = await supabase
    .from("dashboard_layouts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.error("Error getting dashboard layout:", error)
    return null
  }

  if (!data) return null

  return data.layout_json as DashboardLayout
}

// Save dashboard layout for a user (upsert)
export async function saveDashboardLayout(
  userId: string,
  layout: DashboardLayout
): Promise<boolean> {
  const supabase = createClientSafe()
  if (!supabase) {
    console.error("Supabase is not configured")
    return false
  }

  const { error } = await supabase.from("dashboard_layouts").upsert(
    {
      user_id: userId,
      layout_json: layout,
      version: 1,
    },
    {
      onConflict: "user_id",
    }
  )

  if (error) {
    console.error("Error saving dashboard layout:", error)
    return false
  }

  return true
}

// Reset dashboard layout to default
export async function resetDashboardLayout(userId: string): Promise<boolean> {
  return saveDashboardLayout(userId, DEFAULT_DASHBOARD_LAYOUT)
}

// Delete dashboard layout for a user
export async function deleteDashboardLayout(userId: string): Promise<boolean> {
  const supabase = createClientSafe()
  if (!supabase) {
    console.error("Supabase is not configured")
    return false
  }

  const { error } = await supabase
    .from("dashboard_layouts")
    .delete()
    .eq("user_id", userId)

  if (error) {
    console.error("Error deleting dashboard layout:", error)
    return false
  }

  return true
}

