"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Maximize, Minimize } from "lucide-react"
import { getQuestionsBySession, type QnaQuestion } from "@/lib/qna-data"
import { getSessionById, type Session, formatSessionTime } from "@/lib/data"
import { QRCodeSVG } from "qrcode.react"

// Use QRCodeSVG from qrcode.react

export default function QnaPresenterView() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<QnaQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => console.error(`Error attempting to enable fullscreen: ${err.message}`))
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => console.error(`Error attempting to exit fullscreen: ${err.message}`))
      }
    }
  }, [])
  
  // Handle escape key to exit presenter view when not in fullscreen
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && !isFullscreen) {
      router.back()
    }
  }, [isFullscreen, router])
  
  useEffect(() => {
    // Add event listener for escape key
    document.addEventListener('keydown', handleKeyDown)
    
    // Add event listener for fullscreen change
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [handleKeyDown])
  
  // Auto refresh questions every few seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get session details
        const sessionData = await getSessionById(sessionId)
        if (sessionData) {
          setSession(sessionData)
        }
        
        // Get questions for this session
        const sessionQuestions = await getQuestionsBySession(sessionId)
        setQuestions(sessionQuestions)
        
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading data:", error)
        setIsLoading(false)
      }
    }
    
    fetchData()
    
    // Set up polling for real-time updates
    const intervalId = setInterval(fetchData, 5000)
    
    return () => clearInterval(intervalId)
  }, [sessionId])
  
  // Generate QR code URL for audience to join
  const qrCodeUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/qna/${sessionId}`
    : `/qna/${sessionId}`
  
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }
  
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-2xl mb-4">Session Not Found</h3>
          <p>Could not find the specified session.</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-[#0d1117] text-white">
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={toggleFullscreen} 
          className="bg-[#21262d] hover:bg-[#30363d] p-2 rounded-md text-gray-300 hover:text-white"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
      </div>
      
      <div className="container mx-auto px-4 py-6 flex h-screen">
        {/* Questions List - Now on the left */}
        <div className="w-2/3 pr-6 overflow-y-auto">
          <h3 className="text-3xl mb-6">Top Questions</h3>
          
          {questions.length > 0 ? (
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
        
        {/* Header & Session Info - Now on the right */}
        <div className="w-1/3 pl-6 border-l border-[#30363d] flex flex-col">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-3">Q&A Session</h1>
            <h2 className="text-2xl mb-4">{session.title}</h2>
            <p className="text-xl text-gray-300 mb-2">{session.stage}</p>
            <p className="text-xl text-red-500">{formatSessionTime(session)}</p>
          </div>
          
          {/* QR Code - Moved higher up */}
          <div className="mt-4">
            <div className="bg-white p-6 rounded-lg inline-block">
              <QRCodeSVG
                value={qrCodeUrl}
                size={220}
                level="H"
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
