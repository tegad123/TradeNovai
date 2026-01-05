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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'university/[classId]/layout.tsx:useEffect',message:'class layout resolving course',data:{classId,coursesCount:courses.length,currentCourseId:currentCourse?.id||null},timestamp:Date.now(),sessionId:'debug-session',runId:'class-layout-v1',hypothesisId:'H6'})}).catch(()=>{});
    // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'university/[classId]/layout.tsx:useEffect',message:'selectCourse attempted',data:{classId},timestamp:Date.now(),sessionId:'debug-session',runId:'class-layout-v1',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
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

