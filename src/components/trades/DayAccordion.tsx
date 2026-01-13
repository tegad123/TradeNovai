"use client"

import { ChevronDown, StickyNote, Play, MoreVertical, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DayData, Trade } from "@/lib/types/trades"
import { DayStatsRow } from "./DayStatsRow"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

interface DayAccordionProps {
  day: DayData
  isExpanded: boolean
  onToggle: () => void
  onAddNote?: () => void
  onDeleteTrade?: (trade: Trade) => void
  onDeleteAllTrades?: (day: DayData) => void
  className?: string
}

export function DayAccordion({
  day,
  isExpanded,
  onToggle,
  onAddNote,
  onDeleteTrade,
  onDeleteAllTrades,
  className,
}: DayAccordionProps) {

  return (
    <div className={cn("glass-card overflow-hidden", className)}>
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Expand/collapse icon */}
          <ChevronDown
            className={cn(
              "w-5 h-5 text-[var(--text-muted)] transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
          
          {/* Day label */}
          <span className="text-sm font-medium text-white">{day.dayLabel}</span>
          
          {/* Trade count badge */}
          <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-[var(--text-muted)]">
            {day.totalTrades} trade{day.totalTrades !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Net P&L */}
          <span
            className={cn(
              "text-lg font-bold",
              day.netPnl >= 0 ? "text-emerald-400" : "text-red-400"
            )}
          >
            {day.netPnl >= 0 ? "+" : ""}${day.netPnl.toLocaleString()}
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onAddNote}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-muted)] hover:text-white"
              title="Add note"
            >
              <StickyNote className="w-4 h-4" />
            </button>
            <button
              disabled
              className="p-2 rounded-lg text-[var(--text-muted)]/30 cursor-not-allowed"
              title="Replay (coming soon)"
            >
              <Play className="w-4 h-4" />
            </button>
            {onDeleteAllTrades && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-muted)] hover:text-white"
                    title="More options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                  <DropdownMenuItem 
                    onClick={() => onDeleteAllTrades(day)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete all trades ({day.totalTrades})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </button>

      {/* Expandable content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pb-4 space-y-4">
          {/* Divider */}
          <div className="border-t border-white/10" />
          
          {/* Equity curve chart */}
          {day.equitySeries.length > 0 && (
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={day.equitySeries}>
                  <defs>
                    <linearGradient id={`gradient-${day.date}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={day.netPnl >= 0 ? "#10b981" : "#ef4444"}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={day.netPnl >= 0 ? "#10b981" : "#ef4444"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={false}
                    tickFormatter={(value) => `$${value}`}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "white",
                    }}
                    formatter={(value) => [`$${(value ?? 0).toLocaleString()}`, "P&L"]}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={day.netPnl >= 0 ? "#10b981" : "#ef4444"}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#gradient-${day.date})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Day stats */}
          <DayStatsRow
            totalTrades={day.totalTrades}
            winrate={day.winrate}
            winners={day.winners}
            losers={day.losers}
            grossPnl={day.grossPnl}
            commissions={day.commissions}
            volume={day.volume}
            profitFactor={day.profitFactor}
          />

          {/* Trades table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Symbol</th>
                  <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Side</th>
                  <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Qty</th>
                  <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Entry</th>
                  <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Exit</th>
                  <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">P&L</th>
                  <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium">Time</th>
                  {onDeleteTrade && <th className="w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {day.trades.map((trade) => (
                  <TradeRow 
                    key={trade.id} 
                    trade={trade} 
                    onDelete={onDeleteTrade ? () => onDeleteTrade(trade) : undefined}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// Trade row component
function TradeRow({ trade, onDelete }: { trade: Trade; onDelete?: () => void }) {
  const entryTime = new Date(trade.entryTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const exitTime = new Date(trade.exitTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="py-2 px-3 font-medium text-white">{trade.symbol}</td>
      <td className="py-2 px-3">
        <span
          className={cn(
            "px-2 py-0.5 text-xs font-medium rounded",
            trade.side === "LONG"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          )}
        >
          {trade.side}
        </span>
      </td>
      <td className="py-2 px-3 text-right text-[var(--text-secondary)]">{trade.quantity}</td>
      <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
        ${trade.entryPrice.toFixed(2)}
      </td>
      <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
        ${trade.exitPrice.toFixed(2)}
      </td>
      <td
        className={cn(
          "py-2 px-3 text-right font-medium",
          trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
        )}
      >
        {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
      </td>
      <td className="py-2 px-3 text-right text-[var(--text-muted)] text-xs">
        {entryTime} - {exitTime}
      </td>
      <td className="py-2 px-1 text-right">
        {onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete trade
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  )
}

