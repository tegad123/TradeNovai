"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUniversity } from "@/lib/contexts/UniversityContext"

export default function ClassLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const router = useRouter()
  const { currentCourse, setCurrentCourse, selectCourse, courses, isLoading } = useUniversity()
  const classId = params.classId as string

  useEffect(() => {
    if (isLoading) return

    // Prefer already-loaded courses from context
    const byId = courses.find(c => c.id === classId)
    const byAccessCode = courses.find(c => (c as any).access_code?.toLowerCase?.() === classId.toLowerCase())

    const resolved = byId || byAccessCode || null

    if (resolved) {
      if (!currentCourse || currentCourse.id !== resolved.id) {
        void setCurrentCourse(resolved)
      }

      // If URL used access_code, redirect to canonical UUID route
      if (byAccessCode && !byId) {
        router.replace(`/university/${resolved.id}/home`)
      }
      return
    }

    // If it's not in the user's course list yet, try fetching by ID (UUID route)
    void (async () => {
      await selectCourse(classId)

      // If still not set, bail to /university
      // (selectCourse handles missing IDs by returning null)
    })().catch(() => {
      router.push("/university")
    })
  }, [classId, currentCourse, setCurrentCourse, router, isLoading])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
      </div>
    )
  }

  return <>{children}</>
}

