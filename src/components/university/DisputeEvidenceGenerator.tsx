"use client"

import { useState } from 'react'
import { 
  FileDown, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  ExternalLink,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { EvidenceSummary } from '@/lib/types/engagement'

interface DisputeEvidenceGeneratorProps {
  studentId: string
  studentName: string
  courseId: string
  variant?: 'button' | 'icon'
}

type GenerationState = 'idle' | 'loading' | 'success' | 'error'

interface GenerationResult {
  downloadUrl: string
  fileName: string
  documentId?: string
  summary: EvidenceSummary
  storageError?: string
}

export function DisputeEvidenceGenerator({
  studentId,
  studentName,
  courseId,
  variant = 'button'
}: DisputeEvidenceGeneratorProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<GenerationState>('idle')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Optional dispute context
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeAmount, setDisputeAmount] = useState('')

  const handleGenerate = async () => {
    setState('loading')
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/university/dispute-evidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          courseId,
          disputeReason: disputeReason || undefined,
          disputeAmount: disputeAmount ? parseFloat(disputeAmount) : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate evidence document')
      }

      setResult(data)
      setState('success')
    } catch (err) {
      console.error('Error generating dispute evidence:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setState('error')
    }
  }

  const handleDownload = () => {
    if (result?.downloadUrl) {
      // If it's a base64 URL, create a download link
      if (result.downloadUrl.startsWith('data:')) {
        const link = document.createElement('a')
        link.href = result.downloadUrl
        link.download = result.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        // Open the URL in a new tab
        window.open(result.downloadUrl, '_blank')
      }
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset state after close animation
    setTimeout(() => {
      setState('idle')
      setResult(null)
      setError(null)
      setDisputeReason('')
      setDisputeAmount('')
    }, 300)
  }

  const TriggerButton = variant === 'icon' ? (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      title="Generate Dispute Evidence"
    >
      <FileDown className="w-4 h-4" />
    </Button>
  ) : (
    <Button variant="glass" size="sm">
      <FileDown className="w-4 h-4 mr-2" />
      Dispute Evidence
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {TriggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
            Generate Dispute Evidence
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive PDF document containing all engagement data for {studentName} to use as evidence in chargeback disputes.
          </DialogDescription>
        </DialogHeader>

        {state === 'idle' && (
          <>
            <div className="space-y-4 py-4">
              {/* Optional Context Fields */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Dispute Reason (Optional)
                </label>
                <input
                  type="text"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="e.g., Unauthorized transaction claim"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Dispute Amount (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                  <input
                    type="number"
                    value={disputeAmount}
                    onChange={(e) => setDisputeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-300">
                  The generated PDF will include enrollment proof, lesson completion timeline, 
                  assignment submissions, trade logs, messaging activity, and engagement scores.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate}>
                <FileDown className="w-4 h-4 mr-2" />
                Generate PDF
              </Button>
            </DialogFooter>
          </>
        )}

        {state === 'loading' && (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-[hsl(var(--theme-primary))] mx-auto animate-spin mb-4" />
            <p className="text-white font-medium">Generating Evidence Document...</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Compiling activity data and creating PDF
            </p>
          </div>
        )}

        {state === 'success' && result && (
          <>
            <div className="py-6">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              </div>
              
              <h3 className="text-center text-white font-semibold mb-2">
                Document Generated Successfully
              </h3>
              <p className="text-center text-sm text-[var(--text-muted)] mb-6">
                {result.fileName}
              </p>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-[var(--text-muted)]">Lessons</p>
                  <p className="text-lg font-bold text-white">
                    {result.summary.completedLessons}/{result.summary.totalLessons}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-[var(--text-muted)]">Assignments</p>
                  <p className="text-lg font-bold text-white">
                    {result.summary.totalAssignments}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-[var(--text-muted)]">Trade Logs</p>
                  <p className="text-lg font-bold text-white">
                    {result.summary.totalTradeLogs}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-[var(--text-muted)]">Engagement</p>
                  <p className="text-lg font-bold text-white">
                    {result.summary.avgEngagementScore}/100
                  </p>
                </div>
              </div>

              {result.storageError && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-4">
                  <p className="text-xs text-yellow-300">
                    Note: PDF was generated but storage upload failed. The download below is a direct file.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={handleClose} className="sm:mr-auto">
                Close
              </Button>
              <Button onClick={handleDownload}>
                {result.downloadUrl.startsWith('data:') ? (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open PDF
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Generation Failed</h3>
              <p className="text-sm text-red-400 mb-4">{error}</p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
              <Button onClick={() => setState('idle')}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

