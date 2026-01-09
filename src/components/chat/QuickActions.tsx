"use client";

import React from "react";

interface QuickActionsProps {
  onSendPrompt: (prompt: string) => void;
}

const QUICK_PROMPTS = [
  {
    label: "Summarize My Trades",
    prompt: "Summarize my trading performance. What are my key stats like win rate, profit factor, and net P&L?",
    description: "Get a performance overview",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: "What Did I Upload?",
    prompt: "What trades do you have access to? Tell me about my last import and summarize the data.",
    description: "Check imported trade data",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    label: "Find Loss Patterns",
    prompt: "What patterns are causing my losses? Analyze my losing trades and identify 3 specific things I should work on.",
    description: "Identify recurring mistakes",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    label: "Best Time to Trade",
    prompt: "Based on my trade history, what are my best and worst times of day to trade? When am I most profitable?",
    description: "Optimize trading hours",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Symbol Analysis",
    prompt: "Which symbols am I most profitable trading? Break down my performance by instrument.",
    description: "See performance by symbol",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    label: "Journal Entry",
    prompt: "Help me write a journal entry for today. I want to reflect on my trading decisions and emotions.",
    description: "Start a journal entry",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
];

export function QuickActions({ onSendPrompt }: QuickActionsProps) {
  return (
    <div className="px-4 pb-4">
      <p className="text-sm text-zinc-500 mb-3">Quick prompts to analyze your trades:</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {QUICK_PROMPTS.map((item) => (
          <button
            key={item.label}
            onClick={() => onSendPrompt(item.prompt)}
            className="flex flex-col items-start gap-1 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-[hsl(var(--theme-primary))]/30 hover:bg-zinc-800 transition-all text-left group"
          >
            <div className="flex items-center gap-2 text-[hsl(var(--theme-primary))]">
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </div>
            <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
              {item.description}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[hsl(var(--theme-primary))]/10 to-orange-500/5 border border-[hsl(var(--theme-primary))]/20">
        <p className="text-sm text-zinc-300 mb-2">💡 <strong>I have access to your trade data!</strong></p>
        <p className="text-xs text-zinc-400">
          Ask me anything about your trading performance. I can see your trades, calculate stats, and find patterns in your data.
        </p>
      </div>
    </div>
  );
}

