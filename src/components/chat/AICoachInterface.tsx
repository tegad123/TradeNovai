"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { useChat, Message } from "ai/react"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { ModelSelector } from "./ModelSelector"
import { MessageList } from "./MessageList"
import { ChatInput } from "./ChatInput"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

// Initial coach message
const INITIAL_COACH_MESSAGE: Message = {
  id: "coach-intro",
  role: "assistant",
  content: `Hey — I'm your AI Coach. I'll help you track performance, spot patterns, and improve execution (not give buy/sell signals).

We can:
1. **Set rules & goals** — Define your trading rules and risk parameters
2. **Log a trade** — Record and analyze your trades
3. **Performance report** — Review your stats and metrics
4. **Strategy grading** — Evaluate your setups
5. **Discipline coaching** — Stay accountable to your plan

Start with goals/risk rules or log your most recent trade?`,
}

export function AICoachInterface() {
  const { user, loading: authLoading, signOut } = useSupabaseAuthContext()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [hasShownIntro, setHasShownIntro] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: {
      model: "openai",
    },
    initialMessages: [],
    onError: (err) => {
      setError(err.message || "An error occurred. Please try again.")
    },
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Show initial coach message on first load
  useEffect(() => {
    if (user && !hasShownIntro && messages.length === 0) {
      setMessages([INITIAL_COACH_MESSAGE])
      setHasShownIntro(true)
    }
  }, [user, hasShownIntro, messages.length, setMessages])

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      setError(null)
      handleSubmit(e)
    },
    [handleSubmit]
  )

  const handleNewChat = () => {
    setMessages([INITIAL_COACH_MESSAGE])
    setError(null)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--theme-primary))]" />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[var(--theme-bg-color)]">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white">AI Coach</h1>
        </div>
        <div className="flex items-center gap-3">
          <ModelSelector disabled={isLoading} />
          <button
            onClick={handleNewChat}
            className="px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
          >
            New Chat
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

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

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-[var(--theme-bg-color)]">
        <ChatInput
          input={input}
          onInputChange={(value) => handleInputChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)}
          onSubmit={handleFormSubmit}
          onStop={stop}
          isLoading={isLoading}
        />
        {/* Disclaimer */}
        <p className="text-[10px] text-[var(--text-muted)] text-center mt-2">
          Educational coaching only — not financial advice.
        </p>
      </div>
    </div>
  )
}

