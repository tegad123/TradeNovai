"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Broker, BROKERS, searchBrokers } from "@/lib/config/brokers"
import { BrokerLogo } from "@/components/brokers/BrokerLogo"
import { Button } from "@/components/ui/button"

interface StepBrokerSelectProps {
  selectedBroker: Broker | null
  onSelect: (broker: Broker) => void
  onContinue: () => void
}

export function StepBrokerSelect({ selectedBroker, onSelect, onContinue }: StepBrokerSelectProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredBrokers = useMemo(() => {
    if (!searchQuery.trim()) return BROKERS
    return searchBrokers(searchQuery)
  }, [searchQuery])

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Start typing the broker, prop firm or trading platform"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 focus:border-[hsl(var(--theme-primary))]/50 transition-all"
        />
      </div>

      {/* Popular Brokers section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Popular Brokers</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredBrokers.map((broker) => (
            <button
              key={broker.id}
              onClick={() => onSelect(broker)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                selectedBroker?.id === broker.id
                  ? "bg-[hsl(var(--theme-primary))]/10 border-[hsl(var(--theme-primary))]/50 ring-2 ring-[hsl(var(--theme-primary))]/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
            >
              <BrokerLogo brokerId={broker.id} name={broker.name} size="lg" />
              <span className="text-lg font-medium text-white">{broker.name}</span>
            </button>
          ))}
        </div>

        {filteredBrokers.length === 0 && (
          <div className="text-center py-8 text-[var(--text-muted)]">
            No brokers found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      {/* Continue button */}
      <div className="flex justify-center pt-4">
        <Button
          variant="glass-theme"
          size="lg"
          disabled={!selectedBroker}
          onClick={onContinue}
          className="min-w-[200px]"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

