"use client"

import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CalendarPage() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <PageContainer>
      <GlassCard>
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="glass-circle" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold text-white">January 2026</h2>
          <Button variant="glass-circle" size="icon">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {days.map((day) => (
            <div key={day} className="text-center text-xs text-[var(--text-muted)] py-2 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => {
            const day = i - 3 // Offset for January 2026 starting on Thursday
            const isValidDay = day >= 1 && day <= 31
            return (
              <div
                key={i}
                className={`aspect-square p-2 rounded-lg text-sm flex items-start justify-center ${
                  isValidDay
                    ? "glass text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,var(--ui-opacity-10))] cursor-pointer transition-colors"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {isValidDay ? day : ""}
              </div>
            )
          })}
        </div>
      </GlassCard>
    </PageContainer>
  )
}

