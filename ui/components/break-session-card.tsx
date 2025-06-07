"use client"

import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Session, formatSessionTime, isSessionPast, isSessionActive } from "@/lib/data"

interface BreakSessionCardProps {
  session: Session
  onClick: () => void
}

export function BreakSessionCard({ session, onClick }: BreakSessionCardProps) {
  const isActive = isSessionActive(session)
  const isPast = isSessionPast(session)

  return (
    <div
      className={cn(
        "rounded-lg bg-[#1d2430] px-4 pt-2 pb-6 cursor-pointer transition-opacity hover:opacity-90 border border-[#2d3748] relative",
        isPast && "opacity-70",
      )}
      onClick={onClick}
    >
      <div className="flex items-center mb-3">
        <Clock className="h-4 w-4 mr-2 text-gray-400" />
        <div className="text-sm text-gray-400">{formatSessionTime(session)}</div>
        {isActive && <span className="ml-2 h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>}
      </div>
      
      <h3 className="text-lg font-medium text-center">{session.title}</h3>
    </div>
  )
}
