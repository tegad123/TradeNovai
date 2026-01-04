"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { X, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Broker } from "@/lib/config/brokers"
import { StepBrokerSelect } from "./StepBrokerSelect"
import { StepImportMethod } from "./StepImportMethod"
import { StepManualEntry } from "./StepManualEntry"
import { StepFileUpload } from "./StepFileUpload"

export type ImportMethod = "manual" | "file-upload"
export type WizardStep = 1 | 2 | 3

interface AddTradesWizardProps {
  open: boolean
  onClose: () => void
  onComplete?: () => void
}

export function AddTradesWizard({ open, onClose, onComplete }: AddTradesWizardProps) {
  const [step, setStep] = useState<WizardStep>(1)
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null)
  const [importMethod, setImportMethod] = useState<ImportMethod | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationDirection, setAnimationDirection] = useState<"forward" | "backward">("forward")
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle close with reset
  const handleClose = useCallback(() => {
    setStep(1)
    setSelectedBroker(null)
    setImportMethod(null)
    onClose()
  }, [onClose])

  // Handle back navigation with animation
  const handleBack = useCallback(() => {
    if (step === 1) {
      handleClose()
      return
    }
    
    setAnimationDirection("backward")
    setIsAnimating(true)
    
    setTimeout(() => {
      if (step === 3) {
        setImportMethod(null)
        setStep(2)
      } else if (step === 2) {
        setSelectedBroker(null)
        setStep(1)
      }
      setIsAnimating(false)
    }, 150)
  }, [step, handleClose])

  // Handle broker selection
  const handleBrokerSelect = useCallback((broker: Broker) => {
    setSelectedBroker(broker)
  }, [])

  // Handle continue to step 2 with animation
  const handleBrokerContinue = useCallback(() => {
    if (selectedBroker) {
      setAnimationDirection("forward")
      setIsAnimating(true)
      setTimeout(() => {
        setStep(2)
        setIsAnimating(false)
      }, 150)
    }
  }, [selectedBroker])

  // Handle method selection
  const handleMethodSelect = useCallback((method: ImportMethod) => {
    setImportMethod(method)
  }, [])

  // Handle continue to step 3 with animation
  const handleMethodContinue = useCallback(() => {
    if (importMethod) {
      setAnimationDirection("forward")
      setIsAnimating(true)
      setTimeout(() => {
        setStep(3)
        setIsAnimating(false)
      }, 150)
    }
  }, [importMethod])

  // Handle complete
  const handleComplete = useCallback(() => {
    handleClose()
    onComplete?.()
  }, [handleClose, onComplete])

  // Keyboard accessibility
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === "Escape") {
        e.preventDefault()
        handleClose()
      }
      
      // Enter to continue (only on steps 1 and 2)
      if (e.key === "Enter" && !e.shiftKey) {
        // Don't trigger if user is typing in an input
        const activeElement = document.activeElement
        const isTyping = activeElement?.tagName === "INPUT" || 
                        activeElement?.tagName === "TEXTAREA" ||
                        activeElement?.tagName === "SELECT"
        
        if (isTyping) return
        
        e.preventDefault()
        if (step === 1 && selectedBroker) {
          handleBrokerContinue()
        } else if (step === 2 && importMethod) {
          handleMethodContinue()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, step, selectedBroker, importMethod, handleClose, handleBrokerContinue, handleMethodContinue])

  // Focus trap and initial focus
  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus()
    }
  }, [open])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  // Progress segments
  const totalSteps = 3
  const progressPercent = (step / totalSteps) * 100

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-[var(--theme-bg-color)] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5 z-10">
          {/* Background segments */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 border-r border-black/20" />
            <div className="flex-1 border-r border-black/20" />
            <div className="flex-1" />
          </div>
          {/* Progress fill */}
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[hsl(var(--theme-primary))] to-[hsl(var(--theme-primary)/0.8)] transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Header */}
        <div className="relative px-4 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <button
              onClick={handleBack}
              className="p-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 text-[var(--text-muted)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
              aria-label={step === 1 ? "Close wizard" : "Go back"}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {/* Title */}
            <div className="text-center flex-1 px-4">
              <p className="text-sm text-[hsl(var(--theme-primary))] font-medium mb-0.5">Add Trades</p>
              <h2 id="wizard-title" className="text-lg sm:text-xl font-bold text-white">
                {step === 1 && "Choose Broker, Prop Firm or Trading Platform"}
                {step === 2 && "Select Import Method"}
                {step === 3 && importMethod === "manual" && "Add manually"}
                {step === 3 && importMethod === "file-upload" && "Upload file"}
              </h2>
            </div>
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="p-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 text-[var(--text-muted)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
              aria-label="Close wizard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Step indicator pills */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  s === step 
                    ? "w-8 bg-[hsl(var(--theme-primary))]" 
                    : s < step 
                      ? "w-4 bg-[hsl(var(--theme-primary))]/50" 
                      : "w-4 bg-white/10"
                )}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        
        {/* Content with transitions */}
        <div className="flex-1 overflow-y-auto">
          <div 
            className={cn(
              "p-6 transition-all duration-200",
              isAnimating && animationDirection === "forward" && "opacity-0 translate-x-4",
              isAnimating && animationDirection === "backward" && "opacity-0 -translate-x-4",
              !isAnimating && "opacity-100 translate-x-0"
            )}
          >
            {step === 1 && (
              <StepBrokerSelect
                selectedBroker={selectedBroker}
                onSelect={handleBrokerSelect}
                onContinue={handleBrokerContinue}
              />
            )}
            
            {step === 2 && selectedBroker && (
              <StepImportMethod
                broker={selectedBroker}
                selectedMethod={importMethod}
                onSelect={handleMethodSelect}
                onContinue={handleMethodContinue}
              />
            )}
            
            {step === 3 && selectedBroker && importMethod === "manual" && (
              <StepManualEntry
                broker={selectedBroker}
                onComplete={handleComplete}
                onCancel={handleBack}
              />
            )}
            
            {step === 3 && selectedBroker && importMethod === "file-upload" && (
              <StepFileUpload
                broker={selectedBroker}
                onComplete={handleComplete}
                onCancel={handleBack}
              />
            )}
          </div>
        </div>
        
        {/* Keyboard hints footer */}
        <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-center gap-6 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">Esc</kbd>
              <span>Close</span>
            </span>
            {step < 3 && (
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">Enter</kbd>
                <span>Continue</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">←</kbd>
              <span>Back</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
