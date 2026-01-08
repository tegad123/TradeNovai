"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useChat, Message } from "ai/react";
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { ActionConfirmation } from "./ActionConfirmation";
import { parseActionsFromResponse, type AIAction } from "@/lib/ai/tradeAnalyzerPrompt";

interface ChatInterfaceProps {
  conversationId?: string;
}

interface ExecutedAction {
  type: string;
  success: boolean;
  data?: unknown;
  timestamp: Date;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const { user, loading: authLoading, signInWithGoogle } = useSupabaseAuthContext();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    conversationId || null
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executedActions, setExecutedActions] = useState<ExecutedAction[]>([]);
  const [pendingActions, setPendingActions] = useState<AIAction[]>([]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    append,
  } = useChat({
    api: "/api/chat/trade-analyzer",
    body: {
      includeContext: true,
    },
    onError: (err) => {
      setError(err.message || "An error occurred. Please try again.");
    },
    onFinish: async (message) => {
      // Check for action blocks in the response
      const { actions } = parseActionsFromResponse(message.content);
      if (actions.length > 0) {
        setPendingActions(actions);
      }
    },
  });

  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
    setExecutedActions([]);
    setPendingActions([]);
  };

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      setError(null);
      handleSubmit(e);
    },
    [handleSubmit]
  );

  // Execute pending actions
  const executeAction = async (action: AIAction) => {
    try {
      const response = await fetch('/api/chat/trade-analyzer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();
      
      const executed: ExecutedAction = {
        type: action.type,
        success: result.success,
        data: result.data,
        timestamp: new Date(),
      };
      
      setExecutedActions(prev => [...prev, executed]);
      setPendingActions(prev => prev.filter(a => a !== action));

      // Add confirmation message
      if (result.success) {
        const actionLabels: Record<string, string> = {
          create_journal_entry: 'Journal entry saved',
          create_trade: 'Trade logged',
          link_journal_to_trade: 'Journal linked to trade',
          update_trade: 'Trade updated',
        };
        
        const confirmMessage = actionLabels[action.type] || 'Action completed';
        append({
          role: 'assistant',
          content: `✅ **${confirmMessage}!**\n\nIs there anything else you'd like to add or analyze?`,
        });
      } else {
        append({
          role: 'assistant',
          content: `❌ Failed to ${action.type.replace(/_/g, ' ')}: ${result.error}\n\nWould you like me to try again?`,
        });
      }
    } catch (err) {
      console.error('Error executing action:', err);
      setError('Failed to execute action');
    }
  };

  // Cancel pending action
  const cancelAction = (action: AIAction) => {
    setPendingActions(prev => prev.filter(a => a !== action));
    append({
      role: 'assistant',
      content: `Got it, I won't save that. Is there anything else you'd like to discuss?`,
    });
  };

  // Quick action handlers
  const handleLogTrade = () => {
    const prompt = "I want to log a trade. Please help me record it.";
    handleInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleAddJournalNote = () => {
    const prompt = "I want to add a journal note about my trading today.";
    handleInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleAnalyzeTrades = () => {
    const prompt = "Analyze my recent trades and tell me what patterns you see.";
    handleInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleReviewPerformance = () => {
    const prompt = "Review my trading performance and suggest areas for improvement.";
    handleInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--theme-primary))]" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-800 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-zinc-800">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-[hsl(var(--theme-primary))] to-orange-600 text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-orange-500/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Analysis
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Quick Actions</p>
              <button
                onClick={handleLogTrade}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm">Log a Trade</span>
              </button>
              <button
                onClick={handleAddJournalNote}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-sm">Journal Note</span>
              </button>
              <button
                onClick={handleAnalyzeTrades}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm">Analyze Patterns</span>
              </button>
              <button
                onClick={handleReviewPerformance}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-sm">Review Performance</span>
              </button>
            </div>
          </div>

          {user && (
            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-center gap-3">
                {user.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name || "User"}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">Trade Analyzer</h1>
              <p className="text-xs text-zinc-500">AI-powered journaling & analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs rounded-full bg-[hsl(var(--theme-primary))]/10 text-[hsl(var(--theme-primary))] border border-[hsl(var(--theme-primary))]/20">
              GPT-4o
            </span>
          </div>
        </header>

        {/* Messages or Auth Prompt */}
        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--theme-primary))]/20 to-orange-500/20 flex items-center justify-center mb-6 border border-[hsl(var(--theme-primary))]/20">
              <svg className="w-10 h-10 text-[hsl(var(--theme-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-200 mb-2">Sign in to analyze trades</h2>
            <p className="text-zinc-400 max-w-sm mb-6">
              Get AI-powered trade analysis, journaling assistance, and personalized insights.
            </p>
            <button
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white text-zinc-900 font-medium hover:bg-zinc-100 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
            <MessageList 
              messages={messages} 
              isLoading={isLoading}
              executedActions={executedActions}
            />

            {/* Pending Actions */}
            {pendingActions.length > 0 && (
              <div className="px-4 py-2 space-y-2">
                {pendingActions.map((action, idx) => (
                  <ActionConfirmation
                    key={idx}
                    action={action}
                    onConfirm={() => executeAction(action)}
                    onCancel={() => cancelAction(action)}
                  />
                ))}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="px-4 py-2">
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto p-1 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions (shown when no messages) */}
            {messages.length === 0 && (
              <QuickActions
                onLogTrade={handleLogTrade}
                onAddJournalNote={handleAddJournalNote}
                onAnalyzeTrades={handleAnalyzeTrades}
                onReviewPerformance={handleReviewPerformance}
              />
            )}

            {/* Input */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
              <ChatInput
                input={input}
                onInputChange={(value) => handleInputChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)}
                onSubmit={handleFormSubmit}
                onStop={stop}
                isLoading={isLoading}
                placeholder="Describe a trade, ask for analysis, or share your thoughts..."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
