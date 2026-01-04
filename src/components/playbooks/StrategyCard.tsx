"use client"

import { MoreHorizontal, Edit, Trash2, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Strategy } from "@/lib/types/strategy"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface StrategyCardProps {
  strategy: Strategy
  onEdit?: () => void
  onDelete?: () => void
  onClick?: () => void
  className?: string
}

export function StrategyCard({
  strategy,
  onEdit,
  onDelete,
  onClick,
  className,
}: StrategyCardProps) {
  // Calculate stats (mock for now)
  const stats = strategy.stats || {
    totalTrades: 0,
    winRate: 0,
    profitFactor: 0,
    totalPnL: 0,
    avgWinner: 0,
    avgLoser: 0,
  }

  const rulesCount = strategy.ruleGroups.reduce(
    (acc, group) => acc + group.rules.length,
    0
  )

  return (
    <div
      className={cn(
        "glass-card p-4 hover:bg-white/[0.08] transition-all cursor-pointer group",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        {/* Left: Icon + Info */}
        <div className="flex items-start gap-3">
          {/* Icon/Color badge */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: `${strategy.color}20` }}
          >
            {strategy.icon || "📊"}
          </div>

          {/* Name and description */}
          <div className="min-w-0">
            <h3 className="text-white font-semibold truncate">{strategy.name}</h3>
            {strategy.description && (
              <p className="text-sm text-[var(--text-muted)] truncate mt-0.5">
                {strategy.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-[var(--text-muted)]">
                {strategy.ruleGroups.length} group{strategy.ruleGroups.length !== 1 ? "s" : ""} · {rulesCount} rule{rulesCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Stats + Actions */}
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-[var(--text-muted)] text-xs">Trades</p>
              <p className="text-white font-medium">{stats.totalTrades}</p>
            </div>
            <div className="text-center">
              <p className="text-[var(--text-muted)] text-xs">Win Rate</p>
              <p className="text-white font-medium">{stats.winRate}%</p>
            </div>
            <div className="text-center">
              <p className="text-[var(--text-muted)] text-xs">P&L</p>
              <p
                className={cn(
                  "font-medium",
                  stats.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                ${stats.totalPnL.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[var(--text-muted)] text-xs">Profit Factor</p>
              <p className="text-white font-medium">
                {stats.profitFactor === 0 ? "N/A" : stats.profitFactor.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-muted)] hover:text-white opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.()
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                }}
                className="text-[var(--text-muted)]"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Stats
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.()
                }}
                className="text-red-400 focus:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

