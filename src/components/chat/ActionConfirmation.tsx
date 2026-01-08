"use client";

import React from "react";
import type { AIAction } from "@/lib/ai/tradeAnalyzerPrompt";

interface ActionConfirmationProps {
  action: AIAction;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ActionConfirmation({
  action,
  onConfirm,
  onCancel,
}: ActionConfirmationProps) {
  const getActionDetails = () => {
    switch (action.type) {
      case "create_journal_entry": {
        const data = action.data as {
          content?: string;
          emotion?: string;
          mistakes?: string[];
          rulesFollowed?: string[];
          tags?: string[];
        };
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          title: "Save Journal Entry",
          description: "Save this entry to your trading journal",
          details: [
            data.content && { label: "Content", value: data.content.slice(0, 100) + (data.content.length > 100 ? "..." : "") },
            data.emotion && { label: "Emotion", value: data.emotion },
            data.mistakes?.length && { label: "Mistakes", value: data.mistakes.join(", ") },
            data.rulesFollowed?.length && { label: "Rules Followed", value: data.rulesFollowed.join(", ") },
            data.tags?.length && { label: "Tags", value: data.tags.join(", ") },
          ].filter(Boolean),
        };
      }

      case "create_trade": {
        const data = action.data as {
          symbol?: string;
          side?: string;
          entryPrice?: number;
          exitPrice?: number;
          quantity?: number;
          pnl?: number;
          tradeDate?: string;
        };
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ),
          title: "Log Trade",
          description: "Add this trade to your trading history",
          details: [
            data.symbol && { label: "Symbol", value: data.symbol },
            data.side && { label: "Side", value: data.side.toUpperCase() },
            data.entryPrice && { label: "Entry", value: `$${data.entryPrice}` },
            data.exitPrice && { label: "Exit", value: `$${data.exitPrice}` },
            data.quantity && { label: "Qty", value: String(data.quantity) },
            data.pnl !== undefined && { label: "P&L", value: `$${data.pnl.toFixed(2)}` },
            data.tradeDate && { label: "Date", value: data.tradeDate },
          ].filter(Boolean),
        };
      }

      case "link_journal_to_trade": {
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          ),
          title: "Link to Trade",
          description: "Connect this journal entry to a specific trade",
          details: [],
        };
      }

      case "update_trade": {
        const data = action.data as {
          tradeId?: string;
          notes?: string;
        };
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          title: "Update Trade",
          description: "Add notes to an existing trade",
          details: [
            data.notes && { label: "Notes", value: data.notes.slice(0, 100) + (data.notes.length > 100 ? "..." : "") },
          ].filter(Boolean),
        };
      }

      default:
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          ),
          title: "Execute Action",
          description: action.type,
          details: [],
        };
    }
  };

  const { icon, title, description, details } = getActionDetails();

  return (
    <div className="rounded-xl bg-zinc-800/80 border border-zinc-700/50 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--theme-primary))]/10 flex items-center justify-center text-[hsl(var(--theme-primary))] shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-zinc-100">{title}</h3>
            <p className="text-sm text-zinc-400">{description}</p>
          </div>
        </div>

        {details.length > 0 && (
          <div className="mt-3 space-y-1.5 pl-13">
            {details.map((detail, idx) => (
              <div key={idx} className="flex items-baseline gap-2 text-sm">
                <span className="text-zinc-500 shrink-0">{(detail as { label: string; value: string }).label}:</span>
                <span className="text-zinc-300 truncate">{(detail as { label: string; value: string }).value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-4 py-3 bg-zinc-900/50 border-t border-zinc-700/50">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-[hsl(var(--theme-primary))] to-orange-600 rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20"
        >
          Confirm & Save
        </button>
      </div>
    </div>
  );
}

