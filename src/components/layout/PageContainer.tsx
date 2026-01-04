"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("p-4 sm:p-6 lg:p-8", className)}>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  )
}

