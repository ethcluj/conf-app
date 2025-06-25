"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { type Session, formatSessionTime, getFullStageName } from "@/lib/data"
import { isSessionPast, isSessionActive } from "@/lib/time-utils"
import { useSpeakers, type Speaker } from "@/hooks/use-speakers"
import { SessionStatus } from "@/components/session-status"
import { SpeakerDetails } from "@/components/speaker-details"

interface SessionCardProps {
  session: Session
  onClick: () => void
  onToggleFavorite: (id: string) => void
  isActive?: boolean
}

export function SessionCard({ session, onClick, onToggleFavorite, isActive: propIsActive }: SessionCardProps) {
  const { speakers: apiSpeakers, isLoading: speakersLoading } = useSpeakers();
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [showSpeakerDetails, setShowSpeakerDetails] = useState(false);
  
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
          <div className="flex -space-x-2">
            {session.speakers.map((speaker, i) => {
              // Skip multiple speakers placeholder
              if (speaker.isMultiple) return null;
              
              // Try to find the speaker in our API data
              // Make sure apiSpeakers is an array before using find
              const apiSpeaker = Array.isArray(apiSpeakers) 
                ? apiSpeakers.find((s) => s.name.toLowerCase() === speaker.name.toLowerCase())
                : undefined;
              const speakerImage = apiSpeaker ? apiSpeaker.photo : speaker.image;
              
              // Handle speaker click
              const handleSpeakerClick = (e: React.MouseEvent) => {
                e.stopPropagation(); // Prevent session card click
                if (apiSpeaker) {
                  setSelectedSpeaker(apiSpeaker);
                  setShowSpeakerDetails(true);
                }
              };
              
              return (
                <Avatar 
                  key={i} 
                  className={cn(
                    "h-6 w-6 border border-[#161b22]", 
                    apiSpeaker ? "cursor-pointer hover:border-red-500 transition-colors" : ""
                  )}
                  onClick={apiSpeaker ? handleSpeakerClick : undefined}
                >
                  <AvatarImage src={speakerImage} alt={speaker.name} speakerName={speaker.name} />
                  <AvatarFallback>{speaker.name[0]}</AvatarFallback>
                </Avatar>
              );
            })}
          </div>
          <span className="ml-2 text-sm text-gray-400">
            {session.speakers.length === 1 && !session.speakers[0].isMultiple
              ? session.speakers[0].name
              : `${session.speakers.length} speakers`}
          </span>
        </div>

        <div className={cn("rounded-md px-2 py-1 text-xs font-medium", getLevelBgColor())}>{session.level}</div>
      </div>

      {/* Speaker Details Dialog */}
      <SpeakerDetails
        speaker={selectedSpeaker}
        isOpen={showSpeakerDetails}
        onClose={() => setShowSpeakerDetails(false)}
      />
    </div>
  )
}
