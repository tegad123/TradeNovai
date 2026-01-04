"use client"

import { cn } from "@/lib/utils"

interface BrokerLogoProps {
  brokerId: string
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}

// Placeholder logos - these can be replaced with real logos later
const logoColors: Record<string, { bg: string; text: string }> = {
  ctrader: { bg: "bg-gradient-to-br from-orange-500 to-red-500", text: "text-white" },
  topstepx: { bg: "bg-black", text: "text-white" },
  tradelocker: { bg: "bg-black", text: "text-white" },
  "interactive-brokers": { bg: "bg-gradient-to-br from-red-500 to-red-600", text: "text-white" },
  metatrader4: { bg: "bg-gradient-to-br from-blue-500 to-green-500", text: "text-white" },
  metatrader5: { bg: "bg-gradient-to-br from-green-500 to-blue-500", text: "text-white" },
  thinkorswim: { bg: "bg-gradient-to-br from-green-400 to-green-600", text: "text-white" },
  tradovate: { bg: "bg-gradient-to-br from-blue-400 to-blue-600", text: "text-white" },
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg",
}

export function BrokerLogo({ brokerId, name, size = "md", className }: BrokerLogoProps) {
  const colors = logoColors[brokerId] || { bg: "bg-gray-600", text: "text-white" }
  const initial = name.charAt(0).toUpperCase()
  
  // Special icons for certain brokers
  const renderContent = () => {
    switch (brokerId) {
      case "ctrader":
        return (
          <svg viewBox="0 0 24 24" className="w-2/3 h-2/3" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 12 Q12 6 16 12 Q12 18 8 12" />
          </svg>
        )
      case "topstepx":
        return <span className="font-bold">T</span>
      case "tradelocker":
        return (
          <svg viewBox="0 0 24 24" className="w-2/3 h-2/3" fill="currentColor">
            <rect x="4" y="6" width="6" height="12" rx="1"/>
            <rect x="14" y="6" width="6" height="12" rx="1"/>
          </svg>
        )
      case "interactive-brokers":
        return (
          <svg viewBox="0 0 24 24" className="w-2/3 h-2/3" fill="currentColor">
            <path d="M6 6 L12 18 L18 6 M6 18 L18 18"/>
          </svg>
        )
      case "thinkorswim":
        return (
          <svg viewBox="0 0 24 24" className="w-2/3 h-2/3" fill="currentColor">
            <path d="M12 2 L14 8 L20 8 L15 12 L17 18 L12 14 L7 18 L9 12 L4 8 L10 8 Z"/>
          </svg>
        )
      case "tradovate":
        return (
          <svg viewBox="0 0 24 24" className="w-2/3 h-2/3" fill="currentColor">
            <path d="M4 12 L12 4 L20 12 L12 20 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )
      default:
        return <span className="font-bold">{initial}</span>
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl flex items-center justify-center flex-shrink-0",
        colors.bg,
        colors.text,
        sizeClasses[size],
        className
      )}
    >
      {renderContent()}
    </div>
  )
}

