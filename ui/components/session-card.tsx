"use client"

import { Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { type Session, formatSessionTime, getFullStageName } from "@/lib/data"
import { isSessionPast, isSessionActive } from "@/lib/time-utils"
import { useSpeakers } from "@/hooks/use-speakers"
import { SessionStatus } from "@/components/session-status"

interface SessionCardProps {
  session: Session
  onClick: () => void
  onToggleFavorite: (id: string) => void
  isActive?: boolean
}

export function SessionCard({ session, onClick, onToggleFavorite, isActive: propIsActive }: SessionCardProps) {
  const { speakers: apiSpeakers, isLoading: speakersLoading } = useSpeakers();
  
  // Map level to color if levelColor is not provided
  if (!session.levelColor && session.level) {
    switch (session.level) {
      case "For everyone":
        session.levelColor = "green";
        break;
      case "Beginner":
        session.levelColor = "blue";
        break;
      case "Intermediate":
        session.levelColor = "orange";
        break;
      case "Advanced":
        session.levelColor = "red";
        break;
      default:
        session.levelColor = "green";
    }
  }
  const getLevelBgColor = () => {
    switch (session.levelColor) {
      case "green":
        return "bg-green-600"
      case "orange":
        return "bg-orange-500"
      case "red":
        return "bg-red-600"
      case "blue":
        return "bg-blue-600"
      default:
        return "bg-green-600"
    }
  }

  // Use the prop if provided, otherwise calculate it
  const isActive = propIsActive !== undefined ? propIsActive : isSessionActive(session)

  return (
    <div
      className={cn(
        "rounded-lg p-4 cursor-pointer transition-all hover:opacity-90 relative border",
        isActive 
          ? "bg-[#1e2937] border-red-600" 
          : "bg-[#161b22] border-transparent",
        isSessionPast(session) && "opacity-70",
      )}
      onClick={onClick}
    >
      <button
        className="absolute top-3 right-3 text-gray-400 hover:text-yellow-400 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(session.id)
        }}
      >
        <Star className={`h-5 w-5 ${session.isFavorite ? "text-yellow-400 fill-yellow-400" : ""}`} />
      </button>

      {/* Stage/Location with active indicator */}
      <div className="mb-2 text-sm font-medium text-red-500 flex items-center">
        {getFullStageName(session.stage, session.title)}
        {isActive && <span className="ml-2 h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>}
      </div>
      
      {/* Time and Status */}
      <div className="flex justify-between mb-2">
        <div className="text-sm font-medium text-gray-400">{formatSessionTime(session)}</div>
        <SessionStatus session={session} />
      </div>
      
      {/* Title */}
      <h3 className="mb-3 text-lg font-medium leading-tight">{session.title}</h3>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {session.speakers.length > 2 ? (
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <Avatar key={i} className="h-6 w-6 border border-[#161b22]">
                  <AvatarImage src="/placeholder.svg?height=24&width=24" alt="Speaker" />
                  <AvatarFallback>S</AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : (
            <div className="flex -space-x-2">
              {session.speakers.map((speaker, i) => {
                // Try to find the speaker in our API data
                // Make sure apiSpeakers is an array before using find
                const apiSpeaker = Array.isArray(apiSpeakers) 
                  ? apiSpeakers.find((s) => s.name.toLowerCase() === speaker.name.toLowerCase())
                  : undefined;
                const speakerImage = apiSpeaker ? apiSpeaker.photo : speaker.image;
                
                return (
                  <Avatar key={i} className="h-6 w-6 border border-[#161b22]">
                    <AvatarImage src={speakerImage} alt={speaker.name} speakerName={speaker.name} />
                    <AvatarFallback>{speaker.name[0]}</AvatarFallback>
                  </Avatar>
                );
              })}
            </div>
          )}
          <span className="ml-2 text-sm text-gray-400">
            {session.speakers.length === 1 && !session.speakers[0].isMultiple
              ? session.speakers[0].name
              : "Multiple speakers"}
          </span>
        </div>

        <div className={cn("rounded-md px-2 py-1 text-xs font-medium", getLevelBgColor())}>{session.level}</div>
      </div>
    </div>
  )
}

