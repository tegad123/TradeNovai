"use client"

import { useState, useEffect, useCallback } from "react"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { Plus, BookOpen, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Strategy, CreateStrategyPayload } from "@/lib/types/strategy"
import { listStrategies, createStrategy, updateStrategy, deleteStrategy } from "@/lib/supabase/strategyUtils"
import { StrategyCard } from "@/components/playbooks/StrategyCard"
import { StrategyForm } from "@/components/playbooks/StrategyForm"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function PlaybooksPage() {
  const { user } = useSupabaseAuthContext()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Form state
  const [formOpen, setFormOpen] = useState(false)
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null)
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [strategyToDelete, setStrategyToDelete] = useState<Strategy | null>(null)
  const [deleting, setDeleting] = useState(false)

  // View state
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)

  // Load strategies
  const loadStrategies = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const data = await listStrategies(user.id)
    setStrategies(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadStrategies()
  }, [loadStrategies])

  // Filter strategies by search
  const filteredStrategies = strategies.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Create/update strategy handler
  const handleSubmitStrategy = async (payload: CreateStrategyPayload): Promise<boolean> => {
    if (!user) return false

    try {
      if (editingStrategy) {
        // Update
        const success = await updateStrategy(user.id, editingStrategy.id, payload)
        if (success) {
          await loadStrategies()
          setEditingStrategy(null)
          return true
        }
      } else {
        // Create
        const created = await createStrategy(user.id, payload)
        if (created) {
          await loadStrategies()
          return true
        }
      }
    } catch (error) {
      console.error("Error saving strategy:", error)
    }
    
    return false
  }

  // Delete strategy handler
  const handleDeleteStrategy = async () => {
    if (!user || !strategyToDelete) return
    
    setDeleting(true)
    const success = await deleteStrategy(user.id, strategyToDelete.id)
    
    if (success) {
      await loadStrategies()
      if (selectedStrategy?.id === strategyToDelete.id) {
        setSelectedStrategy(null)
      }
    }
    
    setDeleting(false)
    setDeleteDialogOpen(false)
    setStrategyToDelete(null)
  }

  // Open edit form
  const handleEditStrategy = (strategy: Strategy) => {
    setEditingStrategy(strategy)
    setFormOpen(true)
  }

  // Open delete dialog
  const handleRequestDelete = (strategy: Strategy) => {
    setStrategyToDelete(strategy)
    setDeleteDialogOpen(true)
  }

  // Close form
  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingStrategy(null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Playbooks</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Create and manage your trading strategies
          </p>
        </div>
        <Button 
          variant="glass-theme"
          onClick={() => setFormOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Strategy
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search strategies..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--theme-primary))]" />
        </div>
      ) : filteredStrategies.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--theme-primary))]/10 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-[hsl(var(--theme-primary))]" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchQuery ? "No strategies found" : "No strategies yet"}
          </h3>
          <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            {searchQuery 
              ? "Try a different search term"
              : "Create your first trading strategy to track performance and stay disciplined."}
          </p>
          {!searchQuery && (
            <Button variant="glass-theme" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Strategy
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStrategies.map(strategy => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              onClick={() => setSelectedStrategy(strategy)}
              onEdit={() => handleEditStrategy(strategy)}
              onDelete={() => handleRequestDelete(strategy)}
            />
          ))}
        </div>
      )}

      {/* Strategy Detail Modal */}
      {selectedStrategy && (
        <Dialog open={!!selectedStrategy} onOpenChange={() => setSelectedStrategy(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${selectedStrategy.color}20` }}
                >
                  {selectedStrategy.icon || "📊"}
                </div>
                <div>
                  <DialogTitle>{selectedStrategy.name}</DialogTitle>
                  <DialogDescription>{selectedStrategy.description}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Trades</p>
                  <p className="text-2xl font-bold text-white">
                    {selectedStrategy.stats?.totalTrades || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {selectedStrategy.stats?.winRate || 0}%
                  </p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-[var(--text-muted)] mb-1">P&L</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    (selectedStrategy.stats?.totalPnL || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    ${(selectedStrategy.stats?.totalPnL || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Rule Groups */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Rules</h4>
                {selectedStrategy.ruleGroups.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No rules defined yet.</p>
                ) : (
                  selectedStrategy.ruleGroups.map(group => (
                    <div key={group.id} className="bg-white/5 rounded-xl p-4">
                      <h5 className="text-sm font-medium text-white mb-3">
                        {group.title || "Untitled Group"}
                      </h5>
                      <div className="space-y-2">
                        {group.rules.map(rule => (
                          <div
                            key={rule.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-[var(--text-muted)]">{rule.text}</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              rule.condition === "always" && "bg-emerald-500/20 text-emerald-400",
                              rule.condition === "sometimes" && "bg-yellow-500/20 text-yellow-400",
                              rule.condition === "never" && "bg-red-500/20 text-red-400"
                            )}>
                              {rule.condition}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedStrategy(null)}>
                Close
              </Button>
              <Button variant="glass-theme" onClick={() => {
                handleEditStrategy(selectedStrategy)
                setSelectedStrategy(null)
              }}>
                Edit Strategy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Strategy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{strategyToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteStrategy}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Strategy Form */}
      <StrategyForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitStrategy}
        initialData={editingStrategy ? {
          name: editingStrategy.name,
          description: editingStrategy.description,
          color: editingStrategy.color,
          icon: editingStrategy.icon,
          photoUrl: editingStrategy.photoUrl,
          ruleGroups: editingStrategy.ruleGroups
        } : undefined}
        isEditing={!!editingStrategy}
      />
    </div>
  )
}
