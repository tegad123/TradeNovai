"use client"

import { JournalComingSoon } from "@/components/journal/JournalComingSoon"
import JournalTradesPage from "./_journal/JournalTradesPage"

export default function TradesPage() {
  const enabled = process.env.NEXT_PUBLIC_JOURNAL_PREVIEW === "true"
  return enabled ? <JournalTradesPage /> : <JournalComingSoon title="Trades" />
}


