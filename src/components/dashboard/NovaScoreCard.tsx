"use client"

import { cn } from "@/lib/utils"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"
import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">Nova Score</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Nova Score evaluates your performance by combining essential metrics: 
                  Win %, Profit Factor, Avg Win/Loss, Recovery Factor, Max Drawdown, and Consistency.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Score display with bar */}
        <div className="flex flex-col items-center justify-center min-w-[120px]">
          <div className={cn("text-5xl font-bold", getScoreColor(score))}>
            {score}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1 mb-3">{getScoreLabel(score)}</div>
          
          {/* Score bar */}
          <div className="w-full">
            <div className="relative h-2 rounded-full overflow-hidden">
              {/* Gradient background */}
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e)'
                }}
              />
              {/* Score indicator */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-gray-800 shadow-lg transition-all"
                style={{ left: `calc(${Math.min(score, 100)}% - 6px)` }}
              />
            </div>
            {/* Scale labels */}
            <div className="flex justify-between mt-1 text-[10px] text-[var(--text-muted)]">
              <span>0</span>
              <span>20</span>
              <span>40</span>
              <span>60</span>
              <span>80</span>
              <span>100</span>
            </div>
          </div>
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

