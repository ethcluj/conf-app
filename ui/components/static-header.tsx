"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface StaticHeaderProps {
  children: ReactNode
  className?: string
}

export function StaticHeader({ children, className }: StaticHeaderProps) {
  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-20 bg-[#0d1117]",
        className,
      )}
    >
      {children}
    </div>
  )
}
