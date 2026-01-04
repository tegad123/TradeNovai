"use client"

import { useState, useCallback } from "react"
import { Plus, Search, BookOpen, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"
import { StrategyForm, StrategyCard } from "@/components/playbooks"
import { useStrategies } from "@/lib/hooks/useStrategies"
import { CreateStrategyPayload, Strategy } from "@/lib/types/strategy"

type CreateMode = "scratch" | "template" | null

export default function PlaybooksPage() {
  const { strategies, loading, saving, create, remove } = useStrategies()
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createMode, setCreateMode] = useState<CreateMode>(null)
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null)

  // Filter strategies by search
  const filteredStrategies = strategies.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle create strategy
  const handleCreate = useCallback(
    async (payload: CreateStrategyPayload): Promise<boolean> => {
      const result = await create(payload)
      return result !== null
    },
    [create]
  )

  // Handle delete strategy
  const handleDelete = useCallback(
    async (strategyId: string) => {
      if (confirm("Are you sure you want to delete this strategy?")) {
        await remove(strategyId)
      }
    },
    [remove]
  )

  // Open create modal
  const openCreateModal = (mode: CreateMode) => {
    setCreateMode(mode)
    setShowCreateModal(true)
  }

  // Close create modal
  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreateMode(null)
    setEditingStrategy(null)
  }

  const hasStrategies = strategies.length > 0

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-[var(--text-muted)]">
            Loading strategies...
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Playbooks</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Build and manage your trading strategies
            </p>
          </div>

          {hasStrategies && (
            <Button
              variant="glass-theme"
              onClick={() => openCreateModal("scratch")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Strategy
            </Button>
          )}
        </div>

        {hasStrategies ? (
          <>
            {/* Search + Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search strategies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>
            </div>

            {/* Strategies List */}
            <div className="space-y-3">
              {filteredStrategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onEdit={() => {
                    setEditingStrategy(strategy)
                    setShowCreateModal(true)
                  }}
                  onDelete={() => handleDelete(strategy.id)}
                  onClick={() => {
                    // TODO: Navigate to strategy detail page
                    console.log("View strategy:", strategy.id)
                  }}
                />
              ))}

              {filteredStrategies.length === 0 && searchQuery && (
                <GlassCard className="p-8 text-center">
                  <p className="text-[var(--text-muted)]">
                    No strategies found matching &quot;{searchQuery}&quot;
                  </p>
                </GlassCard>
              )}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <GlassCard className="max-w-lg w-full p-8 text-center">
              {/* Illustration placeholder */}
              <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--theme-primary))]/10 flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-[hsl(var(--theme-primary))]" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                Build your trading strategy
              </h2>
              <p className="text-[var(--text-muted)] mb-8">
                Create custom strategies to organize and analyze your trades.
                Define entry/exit rules and track performance over time.
              </p>

              <Button
                variant="glass-theme"
                size="lg"
                onClick={() => openCreateModal("scratch")}
                className="w-full mb-3"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Strategy
              </Button>
            </GlassCard>

            {/* Create options - shown below empty state card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 max-w-lg w-full">
              <button
                onClick={() => openCreateModal("scratch")}
                className="glass-card p-6 text-left hover:bg-white/[0.08] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--theme-primary))]/10 flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--theme-primary))]/20 transition-colors">
                  <Plus className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
                </div>
                <h3 className="text-white font-semibold mb-1">
                  Create from scratch
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Build your own custom trading strategy.
                </p>
              </button>

              <button
                onClick={() => openCreateModal("template")}
                className="glass-card p-6 text-left hover:bg-white/[0.08] transition-all group opacity-60 cursor-not-allowed"
                disabled
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-white font-semibold mb-1">
                  Browse templates
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Use a template — a faster way to start.
                </p>
                <span className="text-xs text-[var(--text-muted)] mt-2 inline-block">
                  Coming soon
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Strategy Form Modal */}
      <StrategyForm
        open={showCreateModal}
        onClose={closeCreateModal}
        onSubmit={handleCreate}
        initialData={
          editingStrategy
            ? {
                name: editingStrategy.name,
                description: editingStrategy.description,
                color: editingStrategy.color,
                icon: editingStrategy.icon,
                ruleGroups: editingStrategy.ruleGroups,
              }
            : undefined
        }
        isEditing={!!editingStrategy}
      />
    </PageContainer>
  )
}
