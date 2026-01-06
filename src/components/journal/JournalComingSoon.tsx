"use client"

import Link from "next/link"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"

export function JournalComingSoon({ title = "Trade Journal" }: { title?: string }) {
  return (
    <PageContainer>
      <GlassCard className="max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-white">{title} — Coming soon</h1>
          <p className="text-sm text-[var(--text-muted)]">
            TradeNova University is live. The Journal side of the product is being polished for launch.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/university">Go to University</Link>
            </Button>
            <Button asChild variant="glass" className="w-full sm:w-auto">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </GlassCard>
    </PageContainer>
  )
}


