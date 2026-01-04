"use client"

import { useState, useCallback } from "react"
import { X, Upload, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { RulesBuilder } from "./RulesBuilder"
import {
  CreateStrategyPayload,
  StrategyRuleGroup,
  STRATEGY_COLORS,
  STRATEGY_ICONS,
} from "@/lib/types/strategy"

interface StrategyFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: CreateStrategyPayload) => Promise<boolean>
  initialData?: Partial<CreateStrategyPayload>
  isEditing?: boolean
}

export function StrategyForm({
  open,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
}: StrategyFormProps) {
  const [name, setName] = useState(initialData?.name || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [color, setColor] = useState(initialData?.color || STRATEGY_COLORS[0].value)
  const [icon, setIcon] = useState(initialData?.icon || STRATEGY_ICONS[0].value)
  const [photoUrl, setPhotoUrl] = useState(initialData?.photoUrl || "")
  const [ruleGroups, setRuleGroups] = useState<StrategyRuleGroup[]>(
    (initialData?.ruleGroups as StrategyRuleGroup[]) || []
  )
  const [saving, setSaving] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Validation
  const isValid = name.trim().length > 0

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!isValid) return

    setSaving(true)

    const payload: CreateStrategyPayload = {
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
      photoUrl,
      ruleGroups: ruleGroups.map((group, gi) => ({
        title: group.title,
        order: gi,
        rules: group.rules.map((rule, ri) => ({
          text: rule.text,
          condition: rule.condition,
          order: ri,
        })),
      })),
    }

    const success = await onSubmit(payload)

    setSaving(false)

    if (success) {
      onClose()
    }
  }, [isValid, name, description, color, icon, photoUrl, ruleGroups, onSubmit, onClose])

  // Handle close
  const handleClose = useCallback(() => {
    // Reset form
    setName("")
    setDescription("")
    setColor(STRATEGY_COLORS[0].value)
    setIcon(STRATEGY_ICONS[0].value)
    setPhotoUrl("")
    setRuleGroups([])
    onClose()
  }, [onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] mx-4 bg-[var(--theme-bg-color)] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {isEditing ? "Edit Strategy" : "Create new strategy"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-[var(--text-muted)] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* General Info Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">General info</h3>

            {/* Name + Icon/Color */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4">
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-muted)]">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name your trading strategy"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>

              {/* Icon/Color selector */}
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-muted)]">Icon or color</label>
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors min-w-[160px]"
                  >
                    <span className="text-lg">{icon}</span>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-[var(--text-muted)] ml-auto">▼</span>
                  </button>

                  {/* Color/Icon picker dropdown */}
                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-2 p-4 bg-[var(--theme-bg-color)] border border-white/10 rounded-xl shadow-xl z-10 w-64">
                      {/* Icons */}
                      <div className="mb-4">
                        <p className="text-xs text-[var(--text-muted)] mb-2">Icon</p>
                        <div className="flex flex-wrap gap-2">
                          {STRATEGY_ICONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setIcon(opt.value)}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all",
                                icon === opt.value
                                  ? "bg-[hsl(var(--theme-primary))]/20 ring-2 ring-[hsl(var(--theme-primary))]"
                                  : "bg-white/5 hover:bg-white/10"
                              )}
                            >
                              {opt.value}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Colors */}
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-2">Color</p>
                        <div className="flex flex-wrap gap-2">
                          {STRATEGY_COLORS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setColor(opt.value)}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                color === opt.value && "ring-2 ring-white"
                              )}
                              style={{ backgroundColor: opt.value }}
                            >
                              {color === opt.value && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setShowColorPicker(false)}
                        className="w-full mt-4 px-3 py-2 text-sm text-white bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
              />
            </div>

            {/* Photo upload */}
            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Photo</label>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="Upload photo"
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                  readOnly
                />
                <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors">
                  <Upload className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Rules Section */}
          <RulesBuilder
            ruleGroups={ruleGroups}
            onChange={setRuleGroups}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-white/[0.02]">
          <Button variant="glass" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="glass-theme"
            onClick={handleSubmit}
            disabled={!isValid || saving}
          >
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  )
}

