"use client"

import { useState, useRef } from "react"
import {
  LineChart,
  Calendar,
  Image as ImageIcon,
  Send,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Upload,
  X,
} from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"
import { useUniversityTradeLogs } from "@/lib/hooks/useUniversityTradeLogs"
import { useUniversity } from "@/lib/contexts/UniversityContext"
import { uploadScreenshot } from "@/lib/supabase/storageUtils"
import type { UniversityTradeLog } from "@/lib/supabase/universityUtils"

interface PageProps {
  params: { classId: string }
}

export default function TradeLogsPage({ params }: PageProps) {
  const { classId } = params
  const { currentRole, currentUser } = useUniversity()
  const { tradeLogs, isLoading, submitTradeLog } = useUniversityTradeLogs(classId, currentRole)
  
  const [showForm, setShowForm] = useState(false)
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0])
  const [reflection, setReflection] = useState("")
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  
  const screenshotInputRef = useRef<HTMLInputElement>(null)

  const isInstructor = currentRole === 'instructor'
  
  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setScreenshotFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setScreenshotPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  
  const clearScreenshot = () => {
    setScreenshotFile(null)
    setScreenshotPreview(null)
    if (screenshotInputRef.current) {
      screenshotInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!reflection.trim() || !currentUser) return
    
    setIsSubmitting(true)
    
    let screenshotUrl: string | undefined
    
    // Upload screenshot if present
    if (screenshotFile) {
      setUploadingScreenshot(true)
      const result = await uploadScreenshot(screenshotFile, currentUser.id)
      setUploadingScreenshot(false)
      
      if (result.success && result.url) {
        screenshotUrl = result.url
      } else {
        alert('Failed to upload screenshot: ' + result.error)
        setIsSubmitting(false)
        return
      }
    }
    
    const success = await submitTradeLog(tradeDate, reflection.trim(), screenshotUrl)
    
    if (success) {
      setShowForm(false)
      setReflection("")
      setTradeDate(new Date().toISOString().split('T')[0])
      clearScreenshot()
    }
    
    setIsSubmitting(false)
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusBadge = (log: UniversityTradeLog) => {
    if (log.instructor_feedback) {
      return (
        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          Reviewed
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
        <Clock className="w-3 h-3" />
        Pending Review
      </span>
    )
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Trade Logs</h1>
            <p className="text-[var(--text-muted)]">
              Submit your daily trading reflections for instructor feedback
            </p>
          </div>
          {!isInstructor && (
            <Button 
              variant="glass-theme" 
              size="sm"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          )}
        </div>

        {/* Submission Form */}
        {showForm && !isInstructor && (
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Submit Trade Log</h2>
            
            <div className="space-y-4">
              {/* Date Picker */}
              <div>
                <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">
                  Trading Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                  />
                </div>
              </div>

              {/* Reflection */}
              <div>
                <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">
                  Your Reflection
                </label>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Describe your trades today, what went well, what could be improved, lessons learned..."
                  rows={6}
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
                />
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">
                  Screenshot (optional)
                </label>
                <input
                  type="file"
                  ref={screenshotInputRef}
                  onChange={handleScreenshotSelect}
                  accept="image/*"
                  className="hidden"
                />
                
                {screenshotPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={screenshotPreview} 
                      alt="Screenshot preview" 
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={clearScreenshot}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-xs text-white truncate">{screenshotFile?.name}</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => screenshotInputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-[hsl(var(--theme-primary))]/50 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                      <Upload className="w-8 h-8" />
                      <span className="text-sm">Click to upload screenshot</span>
                      <span className="text-xs">PNG, JPG, GIF up to 10MB</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="glass" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="glass-theme"
                  onClick={handleSubmit}
                  disabled={!reflection.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {uploadingScreenshot ? 'Uploading...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Entry
                    </>
                  )}
                </Button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Trade Logs List */}
        {tradeLogs.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <LineChart className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Trade Logs Yet</h3>
            <p className="text-[var(--text-muted)] mb-4">
              {isInstructor 
                ? "Your students haven't submitted any trade logs yet"
                : "Start logging your daily trades to get feedback from your instructor"}
            </p>
            {!isInstructor && (
              <Button 
                variant="glass-theme"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Submit Your First Log
              </Button>
            )}
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {tradeLogs.map((log) => (
              <GlassCard 
                key={log.id} 
                className="overflow-hidden"
              >
                {/* Log Header - Clickable */}
                <button
                  className="w-full p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-theme-gradient/20 flex items-center justify-center shrink-0">
                      <LineChart className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
                    </div>
                    
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{formatDate(log.trade_date)}</h3>
                        {getStatusBadge(log)}
                      </div>
                      <p className="text-sm text-[var(--text-muted)] line-clamp-1">
                        {log.reflection}
                      </p>
                    </div>
                  </div>
                  
                  {expandedLog === log.id ? (
                    <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                  )}
                </button>

                {/* Expanded Content */}
                {expandedLog === log.id && (
                  <div className="px-4 pb-4 space-y-4 border-t border-white/10">
                    {/* Full Reflection */}
                    <div className="pt-4">
                      <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Your Reflection</h4>
                      <p className="text-white whitespace-pre-wrap">{log.reflection}</p>
                    </div>

                    {/* Screenshots */}
                    {(log.screenshot_url || (log.screenshots && log.screenshots.length > 0)) && (
                      <div>
                        <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Screenshot</h4>
                        <div className="flex gap-2 flex-wrap">
                          {log.screenshot_url && (
                            <a
                              href={log.screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-xl overflow-hidden border border-white/10 hover:border-[hsl(var(--theme-primary))] transition-colors"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={log.screenshot_url} 
                                alt="Trade screenshot" 
                                className="w-48 h-32 object-cover"
                              />
                            </a>
                          )}
                          {log.screenshots?.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-xl overflow-hidden border border-white/10 hover:border-[hsl(var(--theme-primary))] transition-colors"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={url} 
                                alt={`Trade screenshot ${i + 1}`} 
                                className="w-48 h-32 object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Instructor Feedback */}
                    {log.instructor_feedback && (
                      <div className="p-4 rounded-xl bg-green-400/10 border border-green-400/20">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-green-400" />
                          <h4 className="text-sm font-medium text-green-400">Instructor Feedback</h4>
                        </div>
                        <p className="text-white">{log.instructor_feedback}</p>
                      </div>
                    )}

                    {!log.instructor_feedback && !isInstructor && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-sm text-[var(--text-muted)] text-center">
                          Waiting for instructor feedback...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
