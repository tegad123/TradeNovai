"use client"

import { JournalComingSoon } from "@/components/journal/JournalComingSoon"
import JournalDashboardPage from "./_journal/JournalDashboardPage"

export default function DashboardPage() {
  const enabled = process.env.NEXT_PUBLIC_JOURNAL_PREVIEW === "true"
  return enabled ? <JournalDashboardPage /> : <JournalComingSoon title="Dashboard" />
}


