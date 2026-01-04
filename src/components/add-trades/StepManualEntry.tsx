"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Broker } from "@/lib/config/brokers"
import { Button } from "@/components/ui/button"

export type TradeType = "stock" | "option" | "future" | "future-option" | "forex" | "crypto" | "cfd"

export interface TradeExecution {
  id: string
  dateTime: string
  qty: string
  side: "BUY" | "SELL"
  price: string
  commission: string
  fee: string
}

interface StepManualEntryProps {
  broker: Broker
  onComplete: () => void
  onCancel: () => void
}

const tradeTypes: { id: TradeType; label: string }[] = [
  { id: "stock", label: "Stock" },
  { id: "option", label: "Option" },
  { id: "future", label: "Future" },
  { id: "future-option", label: "Future Option" },
  { id: "forex", label: "Forex" },
  { id: "crypto", label: "Crypto" },
  { id: "cfd", label: "CFD" },
]

function createEmptyExecution(): TradeExecution {
  return {
    id: crypto.randomUUID(),
    dateTime: "",
    qty: "",
    side: "BUY",
    price: "",
    commission: "",
    fee: "",
  }
}

export function StepManualEntry({ broker, onComplete, onCancel }: StepManualEntryProps) {
  const [tradeType, setTradeType] = useState<TradeType>("stock")
  const [symbol, setSymbol] = useState("")
  const [executions, setExecutions] = useState<TradeExecution[]>([createEmptyExecution()])
  const [saving, setSaving] = useState(false)

  const addExecution = useCallback(() => {
    setExecutions((prev) => [...prev, createEmptyExecution()])
  }, [])

  const removeExecution = useCallback((id: string) => {
    setExecutions((prev) => {
      if (prev.length <= 1) return prev // Keep at least one
      return prev.filter((e) => e.id !== id)
    })
  }, [])

  const updateExecution = useCallback((id: string, field: keyof TradeExecution, value: string) => {
    setExecutions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    )
  }, [])

  const isValid = useMemo(() => {
    if (!symbol.trim()) return false
    return executions.some(
      (e) => e.dateTime && e.qty && e.price
    )
  }, [symbol, executions])

  const handleSave = useCallback(async () => {
    if (!isValid) return
    setSaving(true)
    
    // TODO: Save to database
    // For now, simulate a save
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    console.log("Saving trade:", {
      broker: broker.id,
      type: tradeType,
      symbol,
      executions,
    })
    
    setSaving(false)
    onComplete()
  }, [isValid, broker.id, tradeType, symbol, executions, onComplete])

  return (
    <div className="space-y-6">
      {/* Trade Details card */}
      <div className="glass-card p-6 space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">Trade Details</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Use your account time zone (GMT-05:00)
          </p>
        </div>

        <div className="border-t border-white/10" />

        {/* Type selector */}
        <div className="space-y-2">
          <label className="text-sm text-[var(--text-muted)]">Type</label>
          <div className="flex flex-wrap gap-2">
            {tradeTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setTradeType(type.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  tradeType === type.id
                    ? "bg-[hsl(var(--theme-primary))] text-black"
                    : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Symbol input */}
        <div className="space-y-2">
          <label className="text-sm text-[var(--text-muted)]">Symbol</label>
          <input
            type="text"
            placeholder="e.g., AAPL, ES, EURUSD"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full max-w-md px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 focus:border-[hsl(var(--theme-primary))]/50 transition-all"
          />
        </div>

        {/* Executions table */}
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] pb-3 pr-3 min-w-[180px]">
                    Date & Time
                  </th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] pb-3 px-3 min-w-[80px]">
                    Qty
                  </th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] pb-3 px-3 min-w-[100px]">
                    Side
                  </th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] pb-3 px-3 min-w-[100px]">
                    Price, $
                  </th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] pb-3 px-3 min-w-[100px]">
                    Comm, $
                  </th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] pb-3 px-3 min-w-[100px]">
                    Fee, $
                  </th>
                  <th className="pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {executions.map((execution, index) => (
                  <tr key={execution.id} className="border-b border-white/5">
                    <td className="py-2 pr-3">
                      <input
                        type="datetime-local"
                        value={execution.dateTime}
                        onChange={(e) => updateExecution(execution.id, "dateTime", e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 transition-all"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={execution.qty}
                        onChange={(e) => updateExecution(execution.id, "qty", e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 transition-all"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={execution.side}
                        onChange={(e) => updateExecution(execution.id, "side", e.target.value as "BUY" | "SELL")}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 transition-all"
                      >
                        <option value="BUY" className="bg-gray-900">BUY</option>
                        <option value="SELL" className="bg-gray-900">SELL</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={execution.price}
                        onChange={(e) => updateExecution(execution.id, "price", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 transition-all"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={execution.commission}
                        onChange={(e) => updateExecution(execution.id, "commission", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 transition-all"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={execution.fee}
                        onChange={(e) => updateExecution(execution.id, "fee", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 transition-all"
                      />
                    </td>
                    <td className="py-2 pl-3">
                      <button
                        onClick={() => removeExecution(execution.id)}
                        disabled={executions.length <= 1}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          executions.length <= 1
                            ? "text-[var(--text-muted)]/30 cursor-not-allowed"
                            : "text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add execution button */}
          <button
            onClick={addExecution}
            className="flex items-center gap-2 text-[hsl(var(--theme-primary))] hover:text-[hsl(var(--theme-primary))]/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Create new execution</span>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="glass" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="glass-theme"
          disabled={!isValid || saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Trade"}
        </Button>
      </div>
    </div>
  )
}

// Helper for useMemo
import { useMemo } from "react"

