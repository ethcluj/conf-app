"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Maximize, Minimize, MessageCircle, Video, ArrowLeft } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { type Session } from "@/lib/data"

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

interface SessionPresenterViewProps {
  session: Session
  onClose: () => void
  autoFullscreen?: boolean
}

export function SessionPresenterView({ session, onClose, autoFullscreen = false }: SessionPresenterViewProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  
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
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // V key for video
    if (event.key === 'v' || event.key === 'V') {
      setShowVideo(prev => !prev)
    }
    
    // Q key for Q&A presenter view
    if (event.key === 'q' || event.key === 'Q') {
      router.push(`/qna/presenter/${session.id}`)
    }
    
    // S key to return to session view (when in video mode)
    if ((event.key === 's' || event.key === 'S') && showVideo) {
      setShowVideo(false)
    }
    
    // Escape key handling is done by the browser for fullscreen
  }, [router, session.id, showVideo])
  
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
    
    // Auto enter fullscreen if requested
    if (autoFullscreen) {
      enterFullscreen()
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [handleKeyDown, onClose, autoFullscreen, enterFullscreen])
  
  // Generate QR code URL for audience to join Q&A
  const qrCodeUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/qna/${session.id}`
    : `/qna/${session.id}`
  
  // If showing intro video
  if (showVideo) {
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
  
  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-[#0d1117] text-white">
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
