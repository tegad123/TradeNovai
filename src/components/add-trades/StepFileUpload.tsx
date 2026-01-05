"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, Check, X, AlertTriangle, FileText, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Broker } from "@/lib/config/brokers"
import { BrokerLogo } from "@/components/brokers/BrokerLogo"
import { Button } from "@/components/ui/button"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { ImportResult } from "@/lib/types/execution"

interface StepFileUploadProps {
  broker: Broker
  onComplete: () => void
  onCancel: () => void
}

const timezones = [
  { value: "UTC", label: "(GMT+00:00) UTC" },
  { value: "America/New_York", label: "(GMT-05:00) Eastern Time" },
  { value: "America/Chicago", label: "(GMT-06:00) Central Time" },
  { value: "America/Denver", label: "(GMT-07:00) Mountain Time" },
  { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time" },
  { value: "Europe/London", label: "(GMT+00:00) London" },
  { value: "Europe/Paris", label: "(GMT+01:00) Paris" },
  { value: "Asia/Tokyo", label: "(GMT+09:00) Tokyo" },
  { value: "Asia/Singapore", label: "(GMT+08:00) Singapore" },
]

export function StepFileUpload({ broker, onComplete, onCancel }: StepFileUploadProps) {
  const { user } = useSupabaseAuthContext()
  const [timezone, setTimezone] = useState("America/New_York")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    details?: ImportResult
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setUploadResult(null)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadResult(null)
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return
    if (!user?.id) {
      setUploadResult({
        success: false,
        message: "Please log in to import trades.",
      })
      return
    }
    
    setUploading(true)
    
    try {
      // Create form data for API
      const formData = new FormData()
      formData.append("file", file)
      formData.append("userId", user.id)
      formData.append("accountId", "default") // TODO: Allow account selection
      formData.append("broker", broker.id)
      formData.append("timezone", timezone)
      formData.append("format", broker.id === "tradovate" ? "tradovate" : "tradovate") // Default to tradovate format for now
      
      console.log("Uploading file:", {
        broker: broker.id,
        timezone,
        fileName: file.name,
        fileSize: file.size,
        userId: user.id,
      })
      
      // Call the import API
      const response = await fetch("/api/import/csv", {
        method: "POST",
        body: formData,
      })
      
      const result: ImportResult & { error?: string } = await response.json()
      
      if (result.success) {
        const tradesCount = result.tradesCreated + result.tradesUpdated
        setUploadResult({
          success: true,
          message: `Successfully imported ${tradesCount} trade${tradesCount !== 1 ? "s" : ""} (${result.executionsImported} executions) from ${file.name}`,
          details: result,
        })
        
        // Auto-complete after success
        setTimeout(() => {
          onComplete()
        }, 2500)
      } else {
        const errorMsg = result.error || result.errors?.join(", ") || "Unknown error"
        setUploadResult({
          success: false,
          message: `Import failed: ${errorMsg}`,
          details: result,
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to process file. Please check the format and try again.",
      })
    } finally {
      setUploading(false)
    }
  }, [file, broker.id, timezone, onComplete, user])

  const assetLabels = [
    { key: "stocks", label: "Stocks" },
    { key: "futures", label: "Futures" },
    { key: "options", label: "Options" },
    { key: "forex", label: "Forex" },
    { key: "crypto", label: "Crypto" },
    { key: "cfd", label: "Cfd" },
  ] as const

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left panel - Upload */}
      <div className="space-y-6">
        {/* Upload header */}
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Upload your file</h3>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-[hsl(var(--theme-primary))] text-black">
            Takes less than 2 min
          </span>
        </div>

        {/* Timezone selector */}
        <div className="space-y-2">
          <label className="text-sm text-[var(--text-muted)] flex items-center gap-1">
            Time zone
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-xs">i</span>
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 transition-all"
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value} className="bg-gray-900">
                {tz.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--text-muted)]">
            Please select the file time zone. Note that if you want to see data in the application in a different time zone please update it in your settings.
          </p>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">
            This import has limitations. Please review the details by clicking on this message. You&apos;ll find crucial information that may impact your import.
          </p>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center transition-all",
            isDragging
              ? "border-[hsl(var(--theme-primary))] bg-[hsl(var(--theme-primary))]/10"
              : "border-white/20 hover:border-white/30 bg-white/5",
            file && "border-emerald-500/50 bg-emerald-500/5"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          
          {file ? (
            <div className="space-y-3">
              <FileText className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  setUploadResult(null)
                }}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
              <p className="text-[var(--text-muted)]">
                Drag and drop file and upload from your computer
              </p>
              <Button
                variant="glass-theme"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Upload file
              </Button>
            </div>
          )}
        </div>

        {/* Upload result */}
        {uploadResult && (
          <div
            className={cn(
              "space-y-2 p-4 rounded-xl",
              uploadResult.success
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-red-500/10 border border-red-500/20"
            )}
          >
            <div className="flex items-start gap-3">
              {uploadResult.success ? (
                <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p className={cn(
                "text-sm",
                uploadResult.success ? "text-emerald-200" : "text-red-200"
              )}>
                {uploadResult.message}
              </p>
            </div>
            {uploadResult.details && (
              <div className="text-xs text-[var(--text-muted)] pl-8 space-y-1">
                {uploadResult.details.executionsImported > 0 && (
                  <p>• {uploadResult.details.executionsImported} executions imported</p>
                )}
                {uploadResult.details.tradesCreated > 0 && (
                  <p>• {uploadResult.details.tradesCreated} trades created</p>
                )}
                {uploadResult.details.skippedRows > 0 && (
                  <p>• {uploadResult.details.skippedRows} rows skipped (duplicates or invalid)</p>
                )}
                {uploadResult.details.errors && uploadResult.details.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-300">Errors:</p>
                    {uploadResult.details.errors.slice(0, 5).map((err, i) => (
                      <p key={i} className="text-red-300/80">• {err}</p>
                    ))}
                    {uploadResult.details.errors.length > 5 && (
                      <p className="text-red-300/80">... and {uploadResult.details.errors.length - 5} more</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Upload button */}
        {file && !uploadResult?.success && (
          <Button
            variant="glass-theme"
            size="lg"
            disabled={uploading}
            onClick={handleUpload}
            className="w-full"
          >
            {uploading ? "Processing..." : "Process & Import"}
          </Button>
        )}
      </div>

      {/* Right panel - Broker info */}
      <div className="glass-card p-6 space-y-6 h-fit">
        {/* Broker header */}
        <div className="flex items-center gap-4">
          <BrokerLogo brokerId={broker.id} name={broker.name} size="lg" />
          <h3 className="text-xl font-semibold text-white">{broker.name}</h3>
        </div>

        {/* Supported assets */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white">Supported Asset Types:</h4>
          <div className="flex flex-wrap gap-3">
            {assetLabels.map(({ key, label }) => {
              const supported = broker.supportedAssets[key]
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-1.5 text-sm",
                    supported ? "text-white" : "text-[var(--text-muted)]"
                  )}
                >
                  {supported ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  {label}
                </div>
              )
            })}
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">
              How to import trades from {broker.name}
            </h4>
            <a
              href="#"
              className="flex items-center gap-1 text-sm text-[hsl(var(--theme-primary))] hover:underline"
            >
              Integration Guide
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            To import trade data from {broker.name} broker, follow these steps:
          </p>
          <ol className="space-y-2">
            {broker.instructions.map((instruction, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <span className="w-5 h-5 rounded-full bg-[hsl(var(--theme-primary))]/20 text-[hsl(var(--theme-primary))] flex items-center justify-center flex-shrink-0 text-xs font-medium">
                  {index + 1}
                </span>
                {instruction}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

