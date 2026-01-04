"use client"

import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Trade {
  id: string
  symbol: string
  side: "long" | "short"
  entryPrice: number
  exitPrice?: number
  pnl?: number
  status: "open" | "closed"
  date: string
}

interface RecentTradesTableProps {
  trades: Trade[]
  className?: string
}

export function RecentTradesTable({ trades, className }: RecentTradesTableProps) {
  const closedTrades = trades.filter(t => t.status === "closed")
  const openTrades = trades.filter(t => t.status === "open")

  const TradeRow = ({ trade }: { trade: Trade }) => (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="py-3 px-4">
        <span className="font-medium text-white">{trade.symbol}</span>
      </td>
      <td className="py-3 px-4">
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded",
          trade.side === "long" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
        )}>
          {trade.side.toUpperCase()}
        </span>
      </td>
      <td className="py-3 px-4 text-[var(--text-secondary)]">
        ${trade.entryPrice.toFixed(2)}
      </td>
      <td className="py-3 px-4 text-[var(--text-secondary)]">
        {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : "—"}
      </td>
      <td className="py-3 px-4">
        {trade.pnl !== undefined ? (
          <span className={cn(
            "font-medium",
            trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(2)}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-[var(--text-muted)] text-xs">
        {trade.date}
      </td>
    </tr>
  )

  const TableHeader = () => (
    <thead>
      <tr className="text-left text-xs text-[var(--text-muted)] border-b border-white/10">
        <th className="py-2 px-4 font-medium">Symbol</th>
        <th className="py-2 px-4 font-medium">Side</th>
        <th className="py-2 px-4 font-medium">Entry</th>
        <th className="py-2 px-4 font-medium">Exit</th>
        <th className="py-2 px-4 font-medium">P&L</th>
        <th className="py-2 px-4 font-medium">Date</th>
      </tr>
    </thead>
  )

  return (
    <div className={cn("glass-card p-5", className)}>
      <Tabs defaultValue="recent" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Trades</h3>
          <TabsList>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="open">Open ({openTrades.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="recent" className="mt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHeader />
              <tbody>
                {closedTrades.slice(0, 5).map(trade => (
                  <TradeRow key={trade.id} trade={trade} />
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="open" className="mt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHeader />
              <tbody>
                {openTrades.length > 0 ? (
                  openTrades.map(trade => (
                    <TradeRow key={trade.id} trade={trade} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                      No open positions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

