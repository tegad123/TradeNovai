"use client"

import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { Upload } from "lucide-react"

const brokers = [
  { name: "TD Ameritrade", icon: "📊", status: "Coming soon" },
  { name: "Interactive Brokers", icon: "📈", status: "Coming soon" },
  { name: "Robinhood", icon: "🪶", status: "Coming soon" },
  { name: "Webull", icon: "🐂", status: "Coming soon" },
  { name: "E*TRADE", icon: "💹", status: "Coming soon" },
  { name: "CSV Upload", icon: "📄", status: "Available" },
]

export default function ImportPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Broker Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brokers.map((broker) => (
            <GlassCard
              key={broker.name}
              hover
              className="flex items-center gap-4"
            >
              <span className="text-2xl">{broker.icon}</span>
              <div>
                <p className="font-medium text-white">{broker.name}</p>
                <p className="text-sm text-[var(--text-muted)]">{broker.status}</p>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Drop Zone */}
        <GlassCard className="border-dashed">
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-white font-medium mb-1">Drop your file here</p>
            <p className="text-sm text-[var(--text-muted)] mb-4">or click to browse</p>
            <p className="text-xs text-[var(--text-muted)]">Supports CSV, JSON formats</p>
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  )
}

