"use client";

import Link from "next/link";
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext";

export default function Home() {
  const { user, loading, signInWithGoogle, signOut } = useSupabaseAuthContext();

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--theme-bg-color)' }}>
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-theme-gradient flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">TradeNova</span>
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                {user.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name || "User"}
                    className="w-8 h-8 rounded-full ring-2 ring-white/10"
                  />
                )}
                <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">
                  {user.user_metadata?.full_name || user.email}
                </span>
                <button
                  onClick={signOut}
                  className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-lg glass-button text-white hover:bg-white/10 transition-colors text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card text-[hsl(var(--theme-primary))] text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--theme-primary))] animate-pulse" />
            AI-Powered Trade Analysis
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Master Your{" "}
            <span className="bg-gradient-to-r from-[var(--theme-gradient-from)] to-[var(--theme-gradient-to)] bg-clip-text text-transparent">
              Trading Journey
            </span>
          </h1>

          <p className="text-lg text-[var(--text-secondary)] mb-10 max-w-xl mx-auto">
            Track, analyze, and improve your trading performance with intelligent insights.
            Journal your trades, visualize patterns, and unlock your potential.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {loading ? (
              <div className="px-8 py-4 rounded-xl bg-white/10 animate-pulse w-48 h-14" />
            ) : user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-theme-gradient text-white font-semibold hover:opacity-90 transition-all shadow-lg shadow-[hsl(var(--theme-primary))]/25 text-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                Open Dashboard
              </Link>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-theme-gradient text-white font-semibold hover:opacity-90 transition-all shadow-lg shadow-[hsl(var(--theme-primary))]/25 text-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Get Started
              </button>
            )}
            {user && (
              <Link
                href="/trades"
                className="flex items-center gap-2 px-8 py-4 rounded-xl glass-button text-white font-semibold hover:bg-white/10 transition-all text-lg"
              >
                View Trades
              </Link>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto w-full">
          <div className="p-6 rounded-2xl glass-card hover:border-white/20 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--theme-primary))]/10 flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--theme-primary))]/20 transition-colors">
              <svg className="w-6 h-6 text-[hsl(var(--theme-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Performance Analytics</h3>
            <p className="text-sm text-[var(--text-secondary)]">Deep insights into your win rate, P&L, and trading patterns over time.</p>
          </div>

          <div className="p-6 rounded-2xl glass-card hover:border-white/20 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--theme-primary))]/10 flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--theme-primary))]/20 transition-colors">
              <svg className="w-6 h-6 text-[hsl(var(--theme-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Calendar View</h3>
            <p className="text-sm text-[var(--text-secondary)]">Visualize your trading activity with an intuitive calendar heatmap.</p>
          </div>

          <div className="p-6 rounded-2xl glass-card hover:border-white/20 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--theme-primary))]/10 flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--theme-primary))]/20 transition-colors">
              <svg className="w-6 h-6 text-[hsl(var(--theme-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Trade Coach</h3>
            <p className="text-sm text-[var(--text-secondary)]">Get personalized insights and analysis from your AI trading assistant.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-[var(--text-muted)]">
          Built with Next.js, Vercel AI SDK, and Firebase
        </div>
      </footer>
    </main>
  );
}
