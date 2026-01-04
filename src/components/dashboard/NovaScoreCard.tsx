"use client"

import { cn } from "@/lib/utils"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"

interface NovaScoreCardProps {
  score: number
  data: { subject: string; value: number; fullMark: number }[]
  className?: string
}

export function NovaScoreCard({ score, data, className }: NovaScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400"
    if (score >= 60) return "text-[hsl(var(--theme-primary))]"
    if (score >= 40) return "text-yellow-400"
    return "text-red-400"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent"
    if (score >= 60) return "Good"
    if (score >= 40) return "Average"
    return "Needs Work"
  }

  return (
    <div className={cn("glass-card p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-white">Nova Score</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Your trading performance rating</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Score display */}
        <div className="flex flex-col items-center justify-center min-w-[100px]">
          <div className={cn("text-5xl font-bold", getScoreColor(score))}>
            {score}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{getScoreLabel(score)}</div>
        </div>
        
        {/* Radar chart */}
        <div className="flex-1 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid 
                stroke="rgba(255,255,255,0.1)" 
                strokeDasharray="3 3"
              />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                tickLine={false}
              />
              <Radar
                name="Score"
                dataKey="value"
                stroke="var(--theme-gradient-from)"
                fill="var(--theme-gradient-from)"
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

