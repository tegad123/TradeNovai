"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, RotateCcw, Check } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { 
  DashboardLayout, 
  DashboardSection,
  AVAILABLE_KPIS,
} from "@/lib/types/dashboardLayout"

interface CustomizeDashboardDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  layout: DashboardLayout
  onSave: (layout: DashboardLayout) => Promise<boolean>
  onReset: () => Promise<boolean>
  saving?: boolean
}

// Sortable section item
function SortableSectionItem({ 
  section, 
  onToggle 
}: { 
  section: DashboardSection
  onToggle: () => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10",
        isDragging && "opacity-50 bg-white/10"
      )}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-white transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className={cn(
          "text-sm",
          section.enabled ? "text-white" : "text-[var(--text-muted)]"
        )}>
          {section.label}
        </span>
      </div>
      <Switch
        checked={section.enabled}
        onCheckedChange={onToggle}
      />
    </div>
  )
}

export function CustomizeDashboardDrawer({
  open,
  onOpenChange,
  layout,
  onSave,
  onReset,
  saving = false,
}: CustomizeDashboardDrawerProps) {
  const [localLayout, setLocalLayout] = useState<DashboardLayout>(layout)
  const [hasChanges, setHasChanges] = useState(false)

  // Reset local state when drawer opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalLayout(layout)
      setHasChanges(false)
    }
    onOpenChange(isOpen)
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localLayout.sections.findIndex(s => s.id === active.id)
      const newIndex = localLayout.sections.findIndex(s => s.id === over.id)

      const newSections = arrayMove(localLayout.sections, oldIndex, newIndex)
      setLocalLayout({ ...localLayout, sections: newSections })
      setHasChanges(true)
    }
  }

  // Toggle section
  const handleToggleSection = (sectionId: string) => {
    const newSections = localLayout.sections.map(s =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    )
    setLocalLayout({ ...localLayout, sections: newSections })
    setHasChanges(true)
  }

  // Toggle KPI
  const handleToggleKpi = (kpiId: string) => {
    const isSelected = localLayout.kpis.includes(kpiId)
    let newKpis: string[]

    if (isSelected) {
      // Remove KPI (but keep at least 1)
      if (localLayout.kpis.length > 1) {
        newKpis = localLayout.kpis.filter(k => k !== kpiId)
      } else {
        return // Can't remove the last KPI
      }
    } else {
      // Add KPI (max 5)
      if (localLayout.kpis.length < 5) {
        newKpis = [...localLayout.kpis, kpiId]
      } else {
        return // Can't add more than 5
      }
    }

    setLocalLayout({ ...localLayout, kpis: newKpis })
    setHasChanges(true)
  }

  // Save changes
  const handleSave = async () => {
    // Close drawer immediately for better UX
    onOpenChange(false)
    // Save in background
    await onSave(localLayout)
    setHasChanges(false)
  }

  // Reset to default
  const handleReset = async () => {
    // Close drawer immediately for better UX
    onOpenChange(false)
    // Reset in background
    await onReset()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetDescription>
            Toggle sections and drag to reorder. Changes are saved per account.
          </SheetDescription>
        </SheetHeader>

        {/* KPI Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-white mb-3">
            KPI Cards <span className="text-[var(--text-muted)]">({localLayout.kpis.length}/5)</span>
          </h3>
          <div className="space-y-2">
            {AVAILABLE_KPIS.map(kpi => {
              const isSelected = localLayout.kpis.includes(kpi.id)
              return (
                <button
                  key={kpi.id}
                  onClick={() => handleToggleKpi(kpi.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                    isSelected
                      ? "bg-[hsl(var(--theme-primary))]/10 border-[hsl(var(--theme-primary))]/30 text-white"
                      : "bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10"
                  )}
                >
                  <span className="text-sm">{kpi.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-[hsl(var(--theme-primary))]" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section Visibility & Order */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-white mb-3">Dashboard Sections</h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localLayout.sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localLayout.sections.map(section => (
                  <SortableSectionItem
                    key={section.id}
                    section={section}
                    onToggle={() => handleToggleSection(section.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="glass-theme"
            className="w-full"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="glass"
            className="w-full"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

