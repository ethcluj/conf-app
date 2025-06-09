"use client"

import { ArrowLeft, Clock, MapPin, Star } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getSessionById, formatSessionDateTime, type Session, getFullStageName } from "@/lib/data"
import { StaticHeader } from "@/components/static-header"
import { useSpeakers } from "@/hooks/use-speakers"
import { BreakSessionDetails } from "@/components/break-session-details"

export default function SessionDetails() {
  // Use the useParams hook to get the id parameter safely
  const params = useParams()
  const sessionId = params.id as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  
  // Get speakers data from API
  const { speakers: apiSpeakers, isLoading: speakersLoading } = useSpeakers()

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setIsLoading(true)
        const foundSession = await getSessionById(sessionId)
        if (foundSession) {
          // Apply the same session level/difficulty logic as in SessionCard
          if (foundSession.id) {
            const sessionIdNum = parseInt(foundSession.id);
            if (sessionIdNum % 4 === 0) {
              foundSession.level = "For everyone";
              foundSession.levelColor = "green";
              foundSession.difficulty = 1;
            } else if (sessionIdNum % 4 === 1) {
              foundSession.level = "Beginner";
              foundSession.levelColor = "blue";
              foundSession.difficulty = 2;
            } else if (sessionIdNum % 4 === 2) {
              foundSession.level = "Intermediate";
              foundSession.levelColor = "orange";
              foundSession.difficulty = 3;
            } else {
              foundSession.level = "Advanced";
              foundSession.levelColor = "red";
              foundSession.difficulty = 4;
            }
          }
          
          setSession(foundSession)
          setIsFavorite(foundSession.isFavorite)
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

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
    // In a real app, you would update this in a global state or backend
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
            <div className="flex items-center">
              <Link href="/" className="mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <h1 className="text-lg font-bold">Break Info</h1>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <h1 className="text-lg font-bold">Session Info</h1>
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={toggleFavorite}>
              <Star className={`h-6 w-6 ${isFavorite ? "text-yellow-400 fill-yellow-400" : ""}`} />
            </Button>
          </div>
        </div>
      </StaticHeader>

      <div className="container mx-auto max-w-md px-4 pb-6">
        {/* Content with padding to account for fixed header */}
        <div className="pt-20">
          {/* Date, Time and Location */}
          <div className="mb-6 space-y-2">
            <div className="flex items-center text-gray-400">
              <Clock className="mr-2 h-4 w-4" />
              <span className="text-sm">{formatSessionDateTime(session)}</span>
            </div>
            <div className="flex items-center text-gray-400">
              <MapPin className="mr-2 h-4 w-4" />
              <span className="text-sm">{getFullStageName(session.stage, session.title)}</span>
            </div>
          </div>

          {/* Session Title */}
          <h2 className="text-2xl font-bold leading-tight mb-2">{session.title}</h2>
          
          {/* Track Information */}
          <p className="text-sm text-gray-400 mb-4">{session.track || "General Track"}</p>

          {/* Difficulty Level */}
          <div className="mb-8">
            <span
              className={`rounded-full ${session.levelColor === "blue" ? "bg-blue-600" : session.levelColor === "green" ? "bg-green-600" : session.levelColor === "orange" ? "bg-orange-500" : "bg-red-600"} px-4 py-1 text-sm font-medium`}
            >
              {session.level}
            </span>
          </div>

          {/* Speakers */}
          <div className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">Speakers</h3>
            <div className="flex flex-wrap gap-6">
              {session.speakers.map(
                (speaker, index) =>
                  !speaker.isMultiple && (
                    <div key={index} className="flex flex-col items-center mb-2" style={{ minWidth: '80px', maxWidth: '120px' }}>
                      <Avatar className="mb-2 h-16 w-16">
                        {/* Try to find the speaker in our API data */}
                        {(() => {
                          const apiSpeaker = apiSpeakers.find((s) => s.name.toLowerCase() === speaker.name.toLowerCase());
                          const speakerImage = apiSpeaker ? apiSpeaker.photo : speaker.image.replace("40&width=40", "64&width=64");
                          return <AvatarImage src={speakerImage} alt={speaker.name} speakerName={speaker.name} />;
                        })()}
                        <AvatarFallback>{speaker.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-center">{speaker.name}</span>
                      {speaker.title && <span className="text-xs text-gray-400 text-center">{speaker.title}</span>}
                    </div>
                  )
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
              <p className="text-sm leading-relaxed text-gray-300">{session.description}</p>
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
              <div className="rounded-lg bg-[#161b22] p-4">
                <h4 className="mb-2 text-sm text-gray-400">Track</h4>
                <p className="text-sm">{session.track || "General"}</p>
              </div>
            </div>
          </div>

          {/* Q&A button removed */}
        </div>
      </div>
    </div>
  )
}
