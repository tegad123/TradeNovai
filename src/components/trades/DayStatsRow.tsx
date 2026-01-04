"use client"

import { cn } from "@/lib/utils"

interface DayStatsRowProps {
  totalTrades: number
  winrate: number
  winners: number
  losers: number
  grossPnl: number
  commissions: number
  volume: number
  profitFactor: number
  className?: string
}

interface StatItemProps {
  label: string
  value: string | number
  valueClass?: string
}

function StatItem({ label, value, valueClass }: StatItemProps) {
  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-white/5 border border-white/5">
      <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
        {label}
      </span>
      <span className={cn("text-sm font-semibold text-white", valueClass)}>
        {value}
      </span>
    </div>
  )
}

export function DayStatsRow({
  totalTrades,
  winrate,
  winners,
  losers,
  grossPnl,
  commissions,
  volume,
  profitFactor,
  className,
}: DayStatsRowProps) {
  return (
    <div className={cn("grid grid-cols-4 lg:grid-cols-8 gap-2", className)}>
      <StatItem label="Total Trades" value={totalTrades} />
      <StatItem label="Winrate" value={`${winrate}%`} />
      <StatItem 
        label="Winners" 
        value={winners} 
        valueClass="text-emerald-400"
      />
      <StatItem 
        label="Losers" 
        value={losers} 
        valueClass="text-red-400"
      />
      <StatItem 
        label="Gross P&L" 
        value={`$${grossPnl.toLocaleString()}`}
        valueClass={grossPnl >= 0 ? "text-emerald-400" : "text-red-400"}
      />
      <StatItem 
        label="Commissions" 
        value={`$${commissions.toLocaleString()}`}
        valueClass="text-red-400"
      />
      <StatItem label="Volume" value={volume} />
      <StatItem 
        label="Profit Factor" 
        value={profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
      />
    </div>
  )
}

