"use client"

import { ArrowLeft, Calendar, Clock, MapPin, Star, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getSessionById, formatSessionDateTime, type Session, getFullStageName } from "@/lib/data"
import { getSessionTimeStatus, isQnAAvailable } from "@/lib/time-utils"
import { toggleFavorite, isFavorite as checkIsFavorite } from "@/lib/favorites"
import { StaticHeader } from "@/components/static-header"
import { useSpeakers } from "@/hooks/use-speakers"
import { BreakSessionDetails } from "@/components/break-session-details"
import { UnifiedPresenterView } from "@/components/unified-presenter-view"

export default function SessionDetails() {
  // Use the useParams hook to get the id parameter safely
  const params = useParams()
  const sessionId = params.id as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showPresenterView, setShowPresenterView] = useState(false)
  
  // Get speakers data from API
  const { speakers: apiSpeakers, isLoading: speakersLoading } = useSpeakers()

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Command+Enter to enter presenter view
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      setShowPresenterView(true)
    }
  }, [])
  
  useEffect(() => {
    // Add event listener for keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
  
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setIsLoading(true)
        const foundSession = await getSessionById(sessionId)
        if (foundSession) {
          // Map level to color if levelColor is not provided
          if (!foundSession.levelColor && foundSession.level) {
            switch (foundSession.level) {
              case "For everyone":
                foundSession.levelColor = "green";
                break;
              case "Beginner":
                foundSession.levelColor = "blue";
                break;
              case "Intermediate":
                foundSession.levelColor = "orange";
                break;
              case "Advanced":
                foundSession.levelColor = "red";
                break;
              default:
                foundSession.levelColor = "green";
            }
          }
          
          // Check if this session is a favorite using our favorites system
          const sessionIsFavorite = checkIsFavorite(foundSession.id)
          
          // Update the session object with the correct favorite status
          foundSession.isFavorite = sessionIsFavorite
          
          setSession(foundSession)
          setIsFavorite(sessionIsFavorite)
        }
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching session:', error)
        setIsLoading(false)
      }
    }
    
    fetchSession()
  }, [sessionId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }
  
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <p>Session not found</p>
      </div>
    )
  }
  
  // Show presenter view if activated
  if (showPresenterView && session) {
    return <UnifiedPresenterView session={session} onClose={() => setShowPresenterView(false)} />
  }

  const handleToggleFavorite = () => {
    if (session) {
      // Use the toggleFavorite function from favorites.ts
      const newFavoriteStatus = toggleFavorite(session.id)
      setIsFavorite(newFavoriteStatus)
    }
  }

  // Calculate difficulty dots and get difficulty label
  const difficultyDots = session.difficulty || 3
  const maxDots = 5
  
  // Get a descriptive label for the difficulty level
  const getDifficultyLabel = (level: number): string => {
    switch(level) {
      case 1: return "Beginner";
      case 2: return "Easy";
      case 3: return "Intermediate";
      case 4: return "Advanced";
      case 5: return "Expert";
      default: return "Intermediate";
    }
  }
  
  const difficultyLabel = getDifficultyLabel(difficultyDots)

  // Check if this is a break session (stage is NA)
  const isBreakSession = session.stage === 'NA';
  
  if (isBreakSession) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white pb-20">
        <StaticHeader>
          <div className="container mx-auto max-w-md px-4 py-4">
            <div className="flex flex-col">
              <div className="flex items-center">
                <Link href="/" className="mr-4">
                  <ArrowLeft className="h-6 w-6" />
                </Link>
                <div>
                  <h1 className="text-lg font-bold">Break Info</h1>
                  {(() => {
                    const status = getSessionTimeStatus(session);
                    return (
                      <div className="flex items-center">
                        <p className={`text-sm ${status.isActive ? 'text-red-500' : 'text-gray-400'}`}>
                          {status.text}
                        </p>
                        {status.isActive && (
                          <span className="ml-2 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </StaticHeader>

        <div className="container mx-auto max-w-md px-4 pb-6">
          {/* Content with padding to account for fixed header */}
          <div className="pt-20">
            {/* Date and Time */}
            <div className="mb-4">
              <div className="flex items-center mb-2 text-gray-400">
                <Clock className="mr-2 h-4 w-4" />
                <span>{formatSessionDateTime(session)}</span>
              </div>
            </div>
            
            {/* Break Title */}
            <h2 className="text-2xl font-bold mb-6">{session.title}</h2>
            
            {/* Break Session Details */}
            <div className="mb-8">
              <BreakSessionDetails session={session} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white pb-20">
      <StaticHeader>
        <div className="container mx-auto max-w-md px-4 py-4">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Link href="/" className="mr-4">
                  <ArrowLeft className="h-6 w-6" />
                </Link>
                <div>
                  <h1 className="text-lg font-bold">Session Info</h1>
                  {(() => {
                    const status = getSessionTimeStatus(session);
                    return (
                      <div className="flex items-center">
                        <p className={`text-sm ${status.isActive ? 'text-red-500' : 'text-gray-400'}`}>
                          {status.text}
                        </p>
                        {status.isActive && (
                          <span className="ml-2 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleToggleFavorite}>
                <Star className={`h-6 w-6 ${isFavorite ? "text-yellow-400 fill-yellow-400" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </StaticHeader>

      <div className="container mx-auto max-w-md px-4 pb-6">
        {/* Content with padding to account for fixed header */}
        <div className="pt-20">
          {/* Session Title */}
          <h2 className="text-2xl font-bold leading-tight mb-2">{session.title}</h2>
          
          {/* Track Information - only show if it exists */}
          {session.track && (
            <p className="text-sm text-gray-400 mb-4">{session.track}</p>
          )}

          {/* Difficulty Level */}
          <div className="mb-4">
            <span
              className={`rounded-full ${session.levelColor === "blue" ? "bg-blue-600" : session.levelColor === "green" ? "bg-green-600" : session.levelColor === "orange" ? "bg-orange-500" : "bg-red-600"} px-4 py-1 text-sm font-medium`}
            >
              {session.level}
            </span>
          </div>
          
          {/* Date, Time and Location */}
          <div className="mb-8 space-y-2">
            <div className="flex items-center text-gray-400">
              <Clock className="mr-2 h-4 w-4" />
              <span className="text-sm">{formatSessionDateTime(session)}</span>
            </div>
            <div className="flex items-center text-gray-400">
              <MapPin className="mr-2 h-4 w-4" />
              <span className="text-sm">{getFullStageName(session.stage, session.title)}</span>
            </div>
          </div>

          {/* Speakers */}
          <div className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">Speakers</h3>
            <div className="flex flex-wrap gap-6">
              {!session.speakers.some((speaker) => speaker.isMultiple) && session.speakers.map((speaker) => 
                <Link 
                  key={speaker.name} 
                  href={`/speaker/${encodeURIComponent(speaker.name)}?sessionId=${session.id}`}
                  className="flex flex-col items-center mb-2 hover:opacity-80 transition-opacity" 
                  style={{ minWidth: '80px', maxWidth: '120px' }}
                >
                  <Avatar className="mb-2 h-16 w-16 cursor-pointer hover:border-2 hover:border-red-500 transition-colors">
                    {(() => {
                      const apiSpeaker = apiSpeakers.find((s) => s.name.toLowerCase() === speaker.name.toLowerCase());
                      const speakerImage = apiSpeaker ? apiSpeaker.photo : speaker.image.replace("40&width=40", "64&width=64");
                      return <AvatarImage src={speakerImage} alt={speaker.name} speakerName={speaker.name} />;
                    })()}
                    <AvatarFallback>{speaker.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-center">{speaker.name}</span>
                  {speaker.title && <span className="text-xs text-gray-400 text-center">{speaker.title}</span>}
                </Link>
              )}
              {session.speakers.some((speaker) => speaker.isMultiple) && (
                <div className="flex flex-col items-center mb-2" style={{ minWidth: '80px', maxWidth: '120px' }}>
                  <Avatar className="mb-2 h-16 w-16">
                    <AvatarImage src="/placeholder.svg?height=64&width=64" alt="Multiple Speakers" speakerName="Multiple Speakers" />
                    <AvatarFallback>MS</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-center">Multiple Speakers</span>
                  <span className="text-xs text-gray-400 text-center">Various Organizations</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {session.description && (
            <div className="mb-8">
              <h3 className="mb-2 text-xl font-semibold">Description</h3>
              <div className="text-sm leading-relaxed text-gray-300">
                {session.description.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-2">{paragraph}</p>
                ))}
              </div>
            </div>
          )}

          {/* What You'll Learn */}
          {session.learningPoints && session.learningPoints.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-3 text-xl font-semibold">What You'll Learn</h3>
              <ul className="space-y-2">
                {session.learningPoints.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="mr-2 mt-1 h-4 w-4 flex-shrink-0 rounded-full bg-red-600"></div>
                    <span className="text-sm text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Details */}
          <div className="mb-8">
            <h3 className="mb-3 text-xl font-semibold">Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-[#161b22] p-4">
                <h4 className="mb-2 text-sm text-gray-400">Type</h4>
                <p className="text-sm">{session.type || "General"}</p>
              </div>
              {session.track && (
                <div className="rounded-lg bg-[#161b22] p-4">
                  <h4 className="mb-2 text-sm text-gray-400">Track</h4>
                  <p className="text-sm">{session.track}</p>
                </div>
              )}
            </div>
          </div>

          {/* Q&A Button */}
          <div className="mb-8">
            {isQnAAvailable(session) ? (
              <Link href={`/qna/${sessionId}`}>
                <Button className="w-full bg-red-600 hover:bg-red-700 py-6 font-medium text-white">
                  Join Q&A
                </Button>
              </Link>
            ) : (
              <Button 
                className="w-full bg-gray-600 py-6 font-medium text-white cursor-not-allowed opacity-60" 
                disabled
              >
                Q&A Available 5 Min Before Session
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
