import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore"
import { db } from "./firebase"
import { DashboardLayout, DEFAULT_DASHBOARD_LAYOUT } from "@/lib/types/dashboardLayout"

const COLLECTION = "dashboardLayouts"

/**
 * Get dashboard layout for a user
 */
export async function getDashboardLayout(userId: string): Promise<DashboardLayout> {
  if (!db) {
    console.warn("Firestore not initialized, using default layout")
    return DEFAULT_DASHBOARD_LAYOUT
  }

  try {
    const docRef = doc(db, COLLECTION, userId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as { layout: DashboardLayout }
      return data.layout
    }
    
    return DEFAULT_DASHBOARD_LAYOUT
  } catch (error) {
    console.error("Error getting dashboard layout:", error)
    return DEFAULT_DASHBOARD_LAYOUT
  }
}

/**
 * Save dashboard layout for a user
 */
export async function saveDashboardLayout(
  userId: string, 
  layout: DashboardLayout
): Promise<boolean> {
  if (!db) {
    console.warn("Firestore not initialized, cannot save layout")
    return false
  }

  try {
    const docRef = doc(db, COLLECTION, userId)
    await setDoc(docRef, {
      layout,
      updatedAt: new Date().toISOString(),
    })
    return true
  } catch (error) {
    console.error("Error saving dashboard layout:", error)
    return false
  }
}

/**
 * Reset dashboard layout for a user (delete custom layout)
 */
export async function resetDashboardLayout(userId: string): Promise<boolean> {
  if (!db) {
    console.warn("Firestore not initialized, cannot reset layout")
    return false
  }

  try {
    const docRef = doc(db, COLLECTION, userId)
    await deleteDoc(docRef)
    return true
  } catch (error) {
    console.error("Error resetting dashboard layout:", error)
    return false
  }
}

