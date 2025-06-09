"use client"

import { Clock, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Session, formatSessionTime, isSessionPast, isSessionActive, getFullStageName } from "@/lib/data"

interface BreakSessionCardProps {
  session: Session
  onClick: () => void
  isActive?: boolean
}

export function BreakSessionCard({ session, onClick, isActive: propIsActive }: BreakSessionCardProps) {
  // Use the prop if provided, otherwise calculate it
  const isActive = propIsActive !== undefined ? propIsActive : isSessionActive(session)
  const isPast = isSessionPast(session)

  return (
    <div
      className={cn(
        "rounded-lg px-4 pt-2 pb-6 cursor-pointer transition-all hover:opacity-90 relative border",
        isActive 
          ? "bg-[#232f3e] border-red-600" 
          : "bg-[#1d2430] border-[#2d3748]",
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
      
      <div className="flex items-center justify-center mt-2">
        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
        <div className="text-sm text-gray-400">{getFullStageName(session.stage, session.title)}</div>
      </div>
    </div>
  )
}
