"use client"

import { Upload, PlusSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Broker } from "@/lib/config/brokers"
import { BrokerLogo } from "@/components/brokers/BrokerLogo"
import { Button } from "@/components/ui/button"
import { ImportMethod } from "./AddTradesWizard"

interface StepImportMethodProps {
  broker: Broker
  selectedMethod: ImportMethod | null
  onSelect: (method: ImportMethod) => void
  onContinue: () => void
}

const methods = [
  {
    id: "file-upload" as ImportMethod,
    icon: Upload,
    title: "File upload",
    description: "Upload broker-provided file with your trading history",
    recommended: true,
  },
  {
    id: "manual" as ImportMethod,
    icon: PlusSquare,
    title: "Add manually",
    description: "Add your trades one by one with our interface",
    recommended: false,
  },
]

export function StepImportMethod({ broker, selectedMethod, onSelect, onContinue }: StepImportMethodProps) {
  return (
    <div className="space-y-8">
      {/* Broker info */}
      <div className="flex flex-col items-center gap-3">
        <BrokerLogo brokerId={broker.id} name={broker.name} size="lg" />
        <p className="text-[var(--text-secondary)]">
          You&apos;re linking <span className="text-white font-semibold">{broker.name}</span>
        </p>
      </div>

      {/* Method cards */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
        {methods.map((method) => {
          const Icon = method.icon
          return (
            <button
              key={method.id}
              onClick={() => onSelect(method.id)}
              className={cn(
                "relative flex-1 flex flex-col items-center p-8 rounded-xl border transition-all text-center",
                selectedMethod === method.id
                  ? "bg-[hsl(var(--theme-primary))]/10 border-[hsl(var(--theme-primary))]/50 ring-2 ring-[hsl(var(--theme-primary))]/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
            >
              {/* Recommended badge */}
              {method.recommended && (
                <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded-full bg-[hsl(var(--theme-primary))] text-black">
                  Recommended
                </span>
              )}
              
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-[hsl(var(--theme-primary))]" />
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-semibold text-white mb-2">{method.title}</h3>
              
              {/* Description */}
              <p className="text-sm text-[var(--text-muted)]">{method.description}</p>
            </button>
          )
        })}
      </div>

      {/* Continue button */}
      <div className="flex justify-center pt-4">
        <Button
          variant="glass-theme"
          size="lg"
          disabled={!selectedMethod}
          onClick={onContinue}
          className="min-w-[200px]"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

