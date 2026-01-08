"use client";

import React from "react";

interface QuickActionsProps {
  onLogTrade: () => void;
  onAddJournalNote: () => void;
  onAnalyzeTrades: () => void;
  onReviewPerformance: () => void;
}

export function QuickActions({
  onLogTrade,
  onAddJournalNote,
  onAnalyzeTrades,
  onReviewPerformance,
}: QuickActionsProps) {
  return (
    <div className="px-4 pb-4">
      <p className="text-sm text-zinc-500 mb-3">Quick prompts to get started:</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onLogTrade}
          className="flex flex-col items-start gap-1 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-[hsl(var(--theme-primary))]/30 hover:bg-zinc-800 transition-all text-left group"
        >
          <div className="flex items-center gap-2 text-[hsl(var(--theme-primary))]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium text-sm">Log a Trade</span>
          </div>
          <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
            Record entry, exit, and emotions
          </p>
        </button>

        <button
          onClick={onAddJournalNote}
          className="flex flex-col items-start gap-1 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-[hsl(var(--theme-primary))]/30 hover:bg-zinc-800 transition-all text-left group"
        >
          <div className="flex items-center gap-2 text-[hsl(var(--theme-primary))]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="font-medium text-sm">Journal Note</span>
          </div>
          <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
            Reflect on today&apos;s trading
          </p>
        </button>

        <button
          onClick={onAnalyzeTrades}
          className="flex flex-col items-start gap-1 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-[hsl(var(--theme-primary))]/30 hover:bg-zinc-800 transition-all text-left group"
        >
          <div className="flex items-center gap-2 text-[hsl(var(--theme-primary))]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-medium text-sm">Find Patterns</span>
          </div>
          <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
            Analyze recent trade patterns
          </p>
        </button>

        <button
          onClick={onReviewPerformance}
          className="flex flex-col items-start gap-1 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-[hsl(var(--theme-primary))]/30 hover:bg-zinc-800 transition-all text-left group"
        >
          <div className="flex items-center gap-2 text-[hsl(var(--theme-primary))]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="font-medium text-sm">Performance Review</span>
          </div>
          <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
            Get improvement suggestions
          </p>
        </button>
      </div>

      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[hsl(var(--theme-primary))]/10 to-orange-500/5 border border-[hsl(var(--theme-primary))]/20">
        <p className="text-sm text-zinc-300 mb-2">💡 <strong>Pro tip:</strong></p>
        <p className="text-xs text-zinc-400">
          Try saying things like &quot;I bought MGC at 4227 and sold at 4233, felt impatient&quot; and I&apos;ll help you journal it with structured insights.
        </p>
      </div>
    </div>
  );
}

