"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

interface DayData {
  day: string
  score: number | null
}

interface ProgressTrackerCardProps {
  weekData: DayData[]
  todayScore: number
  onChecklistClick?: () => void
  className?: string
}

export function ProgressTrackerCard({ 
  weekData, 
  todayScore, 
  onChecklistClick,
  className 
}: ProgressTrackerCardProps) {
  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-white/5"
    if (score >= 80) return "bg-emerald-500/80"
    if (score >= 60) return "bg-[hsl(var(--theme-primary))]/80"
    if (score >= 40) return "bg-yellow-500/80"
    return "bg-red-500/80"
  }

  return (
    <div className={cn("glass-card p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-white">Progress Tracker</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Weekly performance heatmap</p>
        </div>
      </div>

      {/* Weekly heatmap */}
      <div className="flex gap-2 mb-4">
        {weekData.map((day, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="text-[10px] text-[var(--text-muted)] mb-1">{day.day}</div>
            <div 
              className={cn(
                "aspect-square rounded-md flex items-center justify-center text-xs font-medium",
                getScoreColor(day.score),
                day.score !== null ? "text-white" : "text-[var(--text-muted)]"
              )}
            >
              {day.score ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Today's score */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 mb-4">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Today&apos;s Score</p>
          <p className="text-xl font-bold text-white">{todayScore}</p>
        </div>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          getScoreColor(todayScore)
        )}>
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Checklist button */}
      <Button 
        variant="glass" 
        className="w-full" 
        onClick={onChecklistClick}
      >
        Daily Checklist
      </Button>
    </div>
  )
}

