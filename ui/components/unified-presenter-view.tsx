"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Video, MessageCircle, ArrowLeft, ArrowRight, Maximize } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { type Session } from "@/lib/data"
import { getQuestionsBySession, type QnaQuestion } from "@/lib/qna-data"

// Mock QR code component until qrcode.react package is installed
const QRCode = ({ value, size }: { value: string, size: number, level?: string, renderAs?: string }) => (
  <div 
    style={{ 
      width: size, 
      height: size, 
      backgroundColor: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      padding: '10px',
      textAlign: 'center',
      color: '#000000'
    }}
  >
    Mock QR Code for: {value}
  </div>
);

export type PresenterMode = 'session' | 'qna' | 'video';

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
    
    // Escape key handling is done by the browser for fullscreen
  }, [])
  
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
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl font-bold mb-4">ETHCluj Intro Video</div>
            <div className="w-[800px] h-[450px] bg-gray-800 flex items-center justify-center">
              <p className="text-xl">Video would play here</p>
              <p className="text-sm text-gray-400 mt-2">(Mock implementation)</p>
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
            <div className="mt-4">
              <div className="bg-white p-6 rounded-lg inline-block">
                <QRCode
                  value={qrCodeUrl}
                  size={220}
                  level="H"
                  renderAs="svg"
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
    <div ref={containerRef} className="fixed inset-0 z-50 bg-[#0d1117] text-white">
      {!isFullscreen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-center p-8 bg-[#161b22] rounded-lg shadow-xl max-w-md">
            <h2 className="text-2xl font-bold mb-4">Presenter View</h2>
            <p className="mb-6 text-gray-300">Click the button below to enter fullscreen presenter mode</p>
            <Button 
              onClick={enterFullscreen}
              className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-md text-lg flex items-center gap-2"
            >
              <Maximize className="h-5 w-5" />
              Enter Fullscreen
            </Button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 flex flex-col h-screen">
        {/* Session Title and Info */}
        <div className="flex-grow flex flex-col items-center justify-center text-center mb-8">
          <h1 className="text-5xl font-bold mb-6">{session.title}</h1>
          
          {session.stage && session.stage !== 'NA' && (
            <div className="text-2xl text-red-500 mb-4">
              {session.stage}
            </div>
          )}
          
          {/* Time */}
          <div className="text-xl text-gray-300 mb-8">
            {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
            {new Date(session.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
          
          {/* Speakers */}
          <div className="flex justify-center space-x-8 mb-12">
            {session.speakers && session.speakers.map((speaker, index) => (
              <div key={index} className="flex flex-col items-center">
                <Avatar className="mb-4 h-24 w-24">
                  <AvatarImage src={speaker.image} alt={speaker.name} />
                  <AvatarFallback className="text-2xl">{speaker.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xl font-medium">{speaker.name}</span>
                {speaker.title && <span className="text-lg text-gray-400">{speaker.title}</span>}
              </div>
            ))}
          </div>
        </div>
        
        {/* QR Code */}
        <div className="flex-shrink-0 flex justify-center mb-12">
          <div className="text-center">
            <div className="bg-white p-6 rounded-lg inline-block mb-4">
              <QRCode
                value={qrCodeUrl}
                size={200}
                level="H"
                renderAs="svg"
              />
            </div>
            <div className="text-xl mb-2">Scan to ask questions</div>
            <div className="text-lg text-gray-400">{qrCodeUrl}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
