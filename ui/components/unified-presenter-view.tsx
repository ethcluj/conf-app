"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Video, MessageCircle, ArrowLeft, ArrowRight, Maximize, Trophy } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { type Session } from "@/lib/data"
import { getQuestionsBySession, type QnaQuestion, mockLeaderboard, type LeaderboardEntry } from "@/lib/qna-data"
import { useSpeakers } from "@/hooks/use-speakers"
import { QRCodeSVG } from "qrcode.react"

// QR code configuration
const QR_CODE_LEVEL = "H"; // High error correction level

export type PresenterMode = 'session' | 'qna' | 'video' | 'leaderboard';

interface UnifiedPresenterViewProps {
  session: Session
  onClose: () => void
  initialMode?: PresenterMode
  autoFullscreen?: boolean
}

export function UnifiedPresenterView({ 
  session, 
  onClose, 
  initialMode = 'session',
  autoFullscreen = false 
}: UnifiedPresenterViewProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mode, setMode] = useState<PresenterMode>(initialMode)
  const [questions, setQuestions] = useState<QnaQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Get speakers data from API
  const { speakers: apiSpeakers, isLoading: speakersLoading } = useSpeakers()
  
  // Enter fullscreen mode
  const enterFullscreen = useCallback(() => {
    if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error(`Error attempting to enable fullscreen: ${err.message}`))
    }
  }, [])
  
  // Exit fullscreen mode
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(err => console.error(`Error attempting to exit fullscreen: ${err.message}`))
    }
  }, [])
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // When not in fullscreen mode and dialog is showing
    if (!isFullscreen) {
      // Enter key to enter fullscreen
      if (event.key === 'Enter') {
        enterFullscreen()
        return
      }
      
      // Escape key to cancel
      if (event.key === 'Escape') {
        onClose()
        return
      }
    }
    
    // Only process these shortcuts when in fullscreen mode
    if (isFullscreen) {
      // V key for video
      if (event.key === 'v' || event.key === 'V') {
        setMode('video')
      }
      
      // Q key for Q&A presenter view
      if (event.key === 'q' || event.key === 'Q') {
        setMode('qna')
      }
      
      // S key to return to session view
      if (event.key === 's' || event.key === 'S') {
        setMode('session')
      }
      
      // L key for leaderboard view
      if (event.key === 'l' || event.key === 'L') {
        setMode('leaderboard')
      }
      
      // Escape key handling is done by the browser for fullscreen
    }
  }, [isFullscreen, enterFullscreen, onClose])
  
  // Fetch questions for Q&A mode
  useEffect(() => {
    if (mode === 'qna') {
      const fetchQuestions = async () => {
        try {
          setIsLoading(true)
          // Get questions for this session
          const sessionQuestions = getQuestionsBySession(session.id)
          setQuestions(sessionQuestions)
          setIsLoading(false)
        } catch (error) {
          console.error("Error loading questions:", error)
          setIsLoading(false)
        }
      }
      
      fetchQuestions()
      
      // Set up polling for real-time updates
      const intervalId = setInterval(fetchQuestions, 5000)
      
      return () => clearInterval(intervalId)
    }
  }, [mode, session.id])
  
  useEffect(() => {
    // Add event listener for keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown)
    
    // Add event listener for fullscreen change
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      
      // If exiting fullscreen, call onClose
      if (!document.fullscreenElement) {
        onClose()
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [handleKeyDown, onClose])
  
  // Generate QR code URL for audience to join Q&A
  const qrCodeUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/qna/${session.id}`
    : `/qna/${session.id}`
  
  // If showing intro video
  if (mode === 'video') {
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 bg-black text-white">
        <video
          className="w-full h-full object-cover"
          src="/intro01.mp4"
          autoPlay
          muted={false}
          controls={false}
          onEnded={() => setMode('session')}
        />
      </div>
    )
  }
  
  // If showing leaderboard mode
  if (mode === 'leaderboard') {
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 bg-[#0d1117] text-white">
        <div className="absolute top-4 right-4 z-10">
          <Button 
            onClick={() => setMode('session')}
            className="bg-[#21262d] hover:bg-[#30363d] p-2 rounded-md text-gray-300 hover:text-white"
            size="icon"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="container mx-auto px-4 py-6 flex flex-col h-screen">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-grow-0 pt-8 pb-4 text-center">
              <div className="flex items-center justify-center mb-4">
                <Trophy className="h-12 w-12 text-yellow-500 mr-4" />
                <h1 className="text-5xl font-bold">Q&A Leaderboard</h1>
              </div>
              <p className="text-xl text-gray-300 mb-8">Top contributors from the audience</p>
            </div>
            
            {/* Leaderboard content */}
            <div className="flex-grow flex items-center justify-center">
              <div className="w-full max-w-4xl">
                <div className="bg-[#161b22] rounded-lg overflow-hidden">
                  {/* Header row */}
                  <div className="grid grid-cols-12 gap-2 p-2 bg-[#21262d] text-sm font-bold">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4">Participant</div>
                    <div className="col-span-3 text-center">Questions</div>
                    <div className="col-span-3 text-center">Upvotes</div>
                    <div className="col-span-1 text-center">Score</div>
                  </div>
                  
                  {/* Leaderboard entries */}
                  {mockLeaderboard.map((entry, index) => (
                    <div 
                      key={entry.userId}
                      className={`grid grid-cols-12 gap-2 py-2 px-2 ${index % 2 === 0 ? 'bg-[#161b22]' : 'bg-[#1c2129]'} ${index < 3 ? 'border-l-4' : ''} ${
                        index === 0 ? 'border-yellow-500' : 
                        index === 1 ? 'border-gray-400' : 
                        index === 2 ? 'border-amber-700' : ''
                      }`}
                    >
                      <div className="col-span-1 text-center font-bold flex items-center justify-center">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </div>
                      <div className="col-span-4 font-medium text-base truncate">{entry.displayName}</div>
                      <div className="col-span-3 text-center">{entry.questionsAsked}</div>
                      <div className="col-span-3 text-center">{entry.upvotesReceived}</div>
                      <div className="col-span-1 text-center font-bold text-yellow-500">{entry.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Bottom section with note */}
            <div className="flex-grow-0 flex justify-center items-center py-8">
              <div className="text-center">
                <div className="text-xl text-gray-300">Join the conversation and ask questions to participate in the leaderboard</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // If showing Q&A mode
  if (mode === 'qna') {
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 bg-[#0d1117] text-white">
        <div className="container mx-auto px-4 py-6 flex h-screen">
          {/* Questions List - On the left */}
          <div className="w-2/3 pr-6 overflow-y-auto">
            <h3 className="text-3xl mb-6">Top Questions</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
              </div>
            ) : questions.length > 0 ? (
              <div className="space-y-5">
                {questions.map((question, index) => (
                  <div 
                    key={question.id} 
                    className={`bg-[#161b22] rounded-lg p-6 border-l-4 ${
                      index === 0 ? 'border-red-600' : 'border-[#30363d]'
                    }`}
                  >
                    <div className="flex items-start mb-3">
                      <div className="text-2xl font-bold mr-4 bg-red-600 text-white h-10 w-10 rounded-full flex items-center justify-center">
                        {question.votes}
                      </div>
                      <p className="text-xl leading-tight">{question.content}</p>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span className="text-lg">{question.authorName}</span>
                      <span className="text-lg">
                        {new Date(question.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#161b22] rounded-lg p-8 text-center">
                <h3 className="text-2xl font-medium mb-3">No questions yet</h3>
                <p className="text-gray-400 text-xl">
                  Waiting for audience to submit questions...
                </p>
              </div>
            )}
          </div>
          
          {/* Header & Session Info - On the right */}
          <div className="w-1/3 pl-6 border-l border-[#30363d] flex flex-col">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-3">Q&A Session</h1>
              <h2 className="text-2xl mb-4">{session.title}</h2>
              <p className="text-xl text-gray-300 mb-2">{session.stage}</p>
              <p className="text-xl text-red-500">
                {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                {new Date(session.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
            
            {/* QR Code */}
            <div className="mt-4 w-full">
              <div className="bg-white p-6 rounded-lg inline-block w-4/5">
                <QRCodeSVG
                  value={qrCodeUrl}
                  size={220}
                  level={QR_CODE_LEVEL}
                  className="w-full h-auto"
                />
              </div>
              <div className="mt-4">
                <p className="text-xl mb-2">Scan to ask questions</p>
                <p className="text-sm text-gray-400">or go to {qrCodeUrl}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Default: Session info mode
  return (
    <div ref={containerRef} className="fixed inset-0 z-50 text-white bg-cover bg-center" style={{ backgroundImage: 'url("/ethcluj-background02.png")' }}>
      {!isFullscreen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-center p-8 bg-[#161b22] rounded-lg shadow-xl max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold mb-6">Presenter View</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={enterFullscreen}
                className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-md text-lg flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Maximize className="h-5 w-5" />
                Enter Fullscreen
              </Button>
              <Button 
                onClick={onClose}
                className="bg-transparent hover:bg-gray-700 text-gray-300 border border-gray-600 py-3 px-6 rounded-md text-lg w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 flex flex-col h-screen">
        {/* Main content area with 3 sections */}
        <div className="flex flex-col h-full">
          {/* Top section - Session Title */}
          <div className="flex-grow-0 pt-8 pb-4 mt-[8vh]">
            <h1 className="text-6xl font-bold text-center">{session.title}</h1>
          </div>
          
          {/* Middle section - QR Code (centered) */}
          <div className="flex-grow flex items-center justify-center mt-[2vh]">
            <div className="text-center">
              <div className="bg-white p-6 rounded-lg inline-block mb-4">
                <QRCodeSVG
                  value={qrCodeUrl}
                  size={240}
                  level={QR_CODE_LEVEL}
                />
              </div>
              <div className="text-2xl mb-2">Scan to ask questions</div>
              <div className="text-lg font-bold text-white">{qrCodeUrl}</div>
            </div>
          </div>
          
          {/* Bottom section - Logos and Speakers */}
          <div className="flex-grow-0 flex justify-between items-end pb-8">
            {/* Logos - Bottom Left */}
            <div className="flex items-center gap-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-white">ETHCluj</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-xl font-bold text-white">Akasha</div>
              </div>
            </div>
            
            {/* Speakers - Bottom Right */}
            <div className="flex flex-row-reverse gap-6">
              {session.speakers && session.speakers.map((speaker, index) => (
                !speaker.isMultiple && (
                  <div key={index} className="flex flex-col items-center">
                    <Avatar className="mb-3 h-24 w-24 border-2 border-red-500">
                      {/* Try to find the speaker in our API data */}
                      {(() => {
                        const apiSpeaker = apiSpeakers.find((s) => s.name.toLowerCase() === speaker.name.toLowerCase());
                        const speakerImage = apiSpeaker ? apiSpeaker.photo : speaker.image.replace("40&width=40", "200&width=200");
                        return <AvatarImage src={speakerImage} alt={speaker.name} />;
                      })()}
                      <AvatarFallback className="text-2xl">{speaker.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xl font-medium text-white">{speaker.name}</span>
                    {speaker.title && <span className="text-sm text-gray-400 text-center">{speaker.title}</span>}
                  </div>
                )
              ))}
              {session.speakers && session.speakers.some((speaker) => speaker.isMultiple) && (
                <div className="flex flex-col items-center">
                  <Avatar className="mb-3 h-24 w-24 border-2 border-red-500">
                    <AvatarImage src="/placeholder.svg?height=200&width=200" alt="Multiple Speakers" />
                    <AvatarFallback className="text-2xl">MS</AvatarFallback>
                  </Avatar>
                  <span className="text-xl font-medium text-white">Multiple Speakers</span>
                  <span className="text-sm text-gray-400 text-center">Various Organizations</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
