"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Video, MessageCircle, ArrowLeft, ArrowRight, Maximize, Trophy } from "lucide-react"
import { connectToSSE, disconnectFromSSE, onQuestionAdded, onQuestionDeleted, onUserUpdated, onVoteUpdated, offQuestionAdded, offQuestionDeleted, offVoteUpdated, offUserUpdated } from "@/lib/sse-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Session, getFullStageName } from "@/lib/data"
import { getQuestionsBySession, type QnaQuestion, type LeaderboardEntry } from "@/lib/qna-data"
import * as QnaApi from "@/lib/qna-api"
import { useSpeakers } from "@/hooks/use-speakers"
import { QRCodeSVG } from "qrcode.react"
import { fetchAllSessions } from "@/lib/data"

// Custom hook for video caching
function useVideoCache(videoUrl: string) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null)
  
  useEffect(() => {
    // Check if we already have this video in sessionStorage
    if (typeof window !== 'undefined') {
      const cachedVideoKey = `video-cache-${videoUrl}`
      const cachedVideo = sessionStorage.getItem(cachedVideoKey)
      
      if (cachedVideo) {
        console.log(`Using cached video for ${videoUrl}`)
        setVideoObjectUrl(cachedVideo)
        setIsVideoLoaded(true)
        return
      }
      
      // If not cached, fetch and cache the video
      console.log(`Preloading video: ${videoUrl}`)
      
      fetch(videoUrl)
        .then(response => response.blob())
        .then(blob => {
          // Create a local URL for the video blob
          const objectUrl = URL.createObjectURL(blob)
          
          // Store in sessionStorage for this browser session
          try {
            sessionStorage.setItem(cachedVideoKey, objectUrl)
          } catch (error) {
            console.warn('Failed to cache video in sessionStorage:', error)
          }
          
          setVideoObjectUrl(objectUrl)
          setIsVideoLoaded(true)
          console.log(`Video loaded and cached: ${videoUrl}`)
        })
        .catch(error => {
          console.error(`Error preloading video ${videoUrl}:`, error)
          // If caching fails, fall back to direct URL
          setVideoObjectUrl(null)
          setIsVideoLoaded(true)
        })
    } else {
      // Server-side rendering case
      setIsVideoLoaded(true)
    }
    
    // Cleanup function to revoke object URL when component unmounts
    return () => {
      if (videoObjectUrl && !videoObjectUrl.startsWith('/')) {
        URL.revokeObjectURL(videoObjectUrl)
      }
    }
  }, [videoUrl])
  
  return { videoSrc: videoObjectUrl || videoUrl, isLoaded: isVideoLoaded }
}

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
  session: initialSession, 
  onClose, 
  initialMode = 'session',
  autoFullscreen = false 
}: UnifiedPresenterViewProps) {
  // Disable presenter view for break sessions (stage is 'NA')
  if (initialSession.stage === 'NA') {
    // Close the presenter view immediately for break sessions
    setTimeout(() => onClose(), 0)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Presenter View Not Available</h2>
          <p className="mb-4">Presenter view is disabled for break sessions.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    )
  }
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mode, setMode] = useState<PresenterMode>(initialMode)
  const [questions, setQuestions] = useState<QnaQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [sessionsOnSameStage, setSessionsOnSameStage] = useState<Session[]>([])
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1)
  const [session, setSession] = useState<Session>(initialSession)
  const [lastLeaderboardUpdate, setLastLeaderboardUpdate] = useState<Date | null>(null)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0)
  const [showNavigation, setShowNavigation] = useState(false)
  
  // Get speakers data from API
  const { speakers: apiSpeakers, isLoading: speakersLoading } = useSpeakers()
  
  // Enter fullscreen mode
  const enterFullscreen = useCallback(() => {
    if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {})
    }
  }, [])
  
  // Exit fullscreen mode
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {})
    }
  }, [])
  
  // Fetch sessions on the same stage as the current session
  const fetchSessionsOnSameStage = useCallback(async () => {
    try {
      const allSessions = await fetchAllSessions();
      
      // Filter sessions that are on the same stage as the current session
      const sameStageSessionsUnsorted = allSessions.filter(s => 
        s.stage === session.stage && s.stage !== 'NA' // Exclude break sessions
      );
      
      // Sort sessions by start time
      const sameStageSessions = sameStageSessionsUnsorted.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      
      setSessionsOnSameStage(sameStageSessions);
      
      // Find the index of the current session
      const index = sameStageSessions.findIndex(s => s.id === session.id);
      setCurrentSessionIndex(index);
    } catch (error) {
      console.error('Error fetching sessions on same stage:', error);
    }
  }, [session.id, session.stage]);
  
  // Switch to the previous session on the same stage
  const navigateToPreviousSession = useCallback(() => {
    if (currentSessionIndex > 0 && sessionsOnSameStage.length > 0) {
      // Disconnect from SSE before changing sessions
      if (mode === 'qna') {
        disconnectFromSSE();
      }
      
      const previousSession = sessionsOnSameStage[currentSessionIndex - 1];
      setSession(previousSession);
      setCurrentSessionIndex(currentSessionIndex - 1);
      
      // Reset questions and other session-specific data
      setQuestions([]);
      setMode('session'); // Switch back to session mode when changing sessions
      
      // Update URL without navigating (for bookmarking purposes)
      window.history.replaceState({}, '', `/session/${previousSession.id}`);
    }
  }, [currentSessionIndex, sessionsOnSameStage, mode]);
  
  // Switch to the next session on the same stage
  const navigateToNextSession = useCallback(() => {
    if (currentSessionIndex < sessionsOnSameStage.length - 1 && sessionsOnSameStage.length > 0) {
      // Disconnect from SSE before changing sessions
      if (mode === 'qna') {
        disconnectFromSSE();
      }
      
      const nextSession = sessionsOnSameStage[currentSessionIndex + 1];
      setSession(nextSession);
      setCurrentSessionIndex(currentSessionIndex + 1);
      
      // Reset questions and other session-specific data
      setQuestions([]);
      setMode('session'); // Switch back to session mode when changing sessions
      
      // Update URL without navigating (for bookmarking purposes)
      window.history.replaceState({}, '', `/session/${nextSession.id}`);
    }
  }, [currentSessionIndex, sessionsOnSameStage, mode]);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLeaderboardLoading(true);
      const data = await QnaApi.getLeaderboard();
      setLeaderboard(data);
      const now = new Date();
      setLastLeaderboardUpdate(now);
      setSecondsSinceUpdate(0);
      setLeaderboardLoading(false);
    } catch (error) {
      // Silent error handling for production
      setLeaderboardLoading(false);
    }
  }, [setLeaderboard, setLeaderboardLoading, setLastLeaderboardUpdate, setSecondsSinceUpdate]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // If not in fullscreen mode, only handle Enter key to enter fullscreen
    if (!isFullscreen) {
      // Enter key to enter fullscreen (no modifier keys required)
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
        console.log('L key pressed, current mode:', mode)
        
        if (mode === 'leaderboard') {
          console.log('Already in leaderboard mode, refreshing data')
          // Force refresh the leaderboard data
          fetchLeaderboard()
        } else {
          console.log('Switching to leaderboard mode')
          // Switch to leaderboard mode
          setMode('leaderboard')
        }
        
        // Always refresh on Shift+L regardless of mode
        if (event.shiftKey) {
          console.log('Shift+L pressed, forcing refresh')
          fetchLeaderboard()
        }
      }
      
      // Left arrow key to navigate to previous session on the same stage
      if (event.key === 'ArrowLeft') {
        if (currentSessionIndex > 0) {
          setShowNavigation(true) // Show navigation indicator
          navigateToPreviousSession()
        }
      }
      
      // Right arrow key to navigate to next session on the same stage
      if (event.key === 'ArrowRight') {
        if (currentSessionIndex < sessionsOnSameStage.length - 1) {
          setShowNavigation(true) // Show navigation indicator
          navigateToNextSession()
        }
      }
      
      // Escape key handling is done by the browser for fullscreen
    }
  }, [isFullscreen, enterFullscreen, onClose, setMode, fetchLeaderboard, currentSessionIndex, sessionsOnSameStage.length, navigateToPreviousSession, navigateToNextSession, setShowNavigation])
  
  // Helper function to refresh all questions
  const refreshAllQuestions = useCallback(async () => {
    // Prevent refreshing if component is unmounted or session has changed
    const currentSessionId = session.id;
    
    try {
      setIsLoading(true)
      const sessionQuestions = await getQuestionsBySession(currentSessionId)
      
      // Only update state if we're still on the same session
      if (session.id === currentSessionId) {
        // Sort questions by votes (descending) and then by timestamp (newest first)
        const sortedQuestions = [...sessionQuestions].sort((a, b) => {
          if (b.votes !== a.votes) return b.votes - a.votes;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        
        setQuestions(sortedQuestions)
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      // Silent error handling in production
    } finally {
      if (session.id === currentSessionId) {
        setIsLoading(false)
      }
    }
  }, [session.id]);
  
  // Fetch questions for Q&A mode
  useEffect(() => {
    if (mode === 'qna') {
      refreshAllQuestions();
    }
  }, [mode, session.id, refreshAllQuestions])
  
  // Handle real-time question updates
  const handleQuestionAdded = useCallback((newQuestion: QnaQuestion) => {
    // Only add the question if it belongs to the current session
    if (newQuestion.sessionId === session.id) {
      setQuestions(prevQuestions => {
        // Check if question already exists to prevent duplicates
        const exists = prevQuestions.some(q => q.id === newQuestion.id);
        if (exists) return prevQuestions;
        
        // Convert timestamp to Date if it's not already
        const questionWithDate = {
          ...newQuestion,
          timestamp: newQuestion.timestamp instanceof Date 
            ? newQuestion.timestamp 
            : new Date(newQuestion.timestamp)
        }
        
        // Add new question and sort by votes and creation time
        return [...prevQuestions, questionWithDate]
          .sort((a, b) => {
            // Primary sort by votes (descending)
            if (b.votes !== a.votes) return b.votes - a.votes;
            // Secondary sort by timestamp (newest first)
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          })
      })
    }
  }, [session.id])

  // Handle real-time question deletion
  const handleQuestionDeleted = useCallback(({ questionId }: { questionId: string }) => {
    // Check if we have this question in our state
    setQuestions(prevQuestions => {
      const questionExists = prevQuestions.some(q => q.id === questionId);
      
      // If the question doesn't exist in our state, we should refresh all questions
      // to ensure our state is in sync with the server
      if (!questionExists && mode === 'qna') {
        // Use setTimeout to avoid state update during another state update
        setTimeout(() => refreshAllQuestions(), 0);
        return prevQuestions;
      }
      
      // Remove the question from our state if it exists
      return prevQuestions.filter(q => q.id !== questionId);
    });
  }, [mode, refreshAllQuestions])

  // Handle real-time vote updates
  const handleVoteUpdated = useCallback(({ questionId, voteCount, voteAdded }: { questionId: string, voteCount: number, voteAdded: boolean }) => {
    setQuestions(prevQuestions => {
      // Check if the question exists in our current state
      const questionExists = prevQuestions.some(q => q.id === questionId);
      
      // If the question doesn't exist in our state but we received a vote update for it,
      // we need to fetch all questions to get the updated state
      if (!questionExists && mode === 'qna') {
        // Use setTimeout to avoid state update during another state update
        setTimeout(() => refreshAllQuestions(), 0);
        return prevQuestions; // Return current state, refreshAllQuestions will update it
      }
      
      // Update the vote count for the question if it exists in our state
      const updatedQuestions = prevQuestions.map(q => {
        if (q.id === questionId) {
          // Update vote count
          return {
            ...q,
            votes: voteCount,
            // Update hasUserVoted if this is the current user's vote
            hasUserVoted: voteAdded !== undefined ? q.hasUserVoted !== voteAdded : q.hasUserVoted
          }
        }
        return q
      });
      
      // Sort questions by votes (descending) and then by timestamp (newest first)
      return updatedQuestions.sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    })
  }, [mode, refreshAllQuestions])

  // Handle user display name updates
  const handleUserUpdated = useCallback(({ userId, displayName }: { userId: string, displayName: string }) => {
    // Update questions with the new display name for this user
    setQuestions(prevQuestions => {
      // Check if we have any questions from this user
      const hasUserQuestions = prevQuestions.some(q => q.authorId === userId);
      
      // If we don't have any questions from this user but received an update,
      // we might need to refresh all questions
      if (!hasUserQuestions && mode === 'qna') {
        // Refresh all questions to get the complete state
        refreshAllQuestions();
      }
      
      // Update display names for questions we already have
      return prevQuestions.map(question => 
        question.authorId === userId 
          ? { ...question, authorName: displayName }
          : question
      );
    });
  }, [mode, refreshAllQuestions])

  
  // Set up SSE connection for real-time updates
  useEffect(() => {
    if (mode === 'qna' && session.id) {
      // Disconnect from any existing SSE connection first
      disconnectFromSSE()
      
      // Connect to SSE for this session
      connectToSSE(session.id)
      
      // Register event handlers
      onQuestionAdded(handleQuestionAdded)
      onQuestionDeleted(handleQuestionDeleted)
      onVoteUpdated(handleVoteUpdated)
      onUserUpdated(handleUserUpdated)
      
      // Clean up on unmount or mode change
      return () => {
        // Unregister event handlers to prevent memory leaks
        // and avoid stale closures causing updates to wrong session
        offQuestionAdded(handleQuestionAdded)
        offQuestionDeleted(handleQuestionDeleted)
        offVoteUpdated(handleVoteUpdated)
        offUserUpdated(handleUserUpdated)
        disconnectFromSSE()
      }
    }
  }, [mode, session.id, handleQuestionAdded, handleQuestionDeleted, handleVoteUpdated, handleUserUpdated])
  
  // Initial setup when component mounts
  useEffect(() => {
    fetchSessionsOnSameStage(); // Fetch sessions on the same stage
    fetchLeaderboard();
    setIsLoading(false);
    
    // Preload the intro video in the background
    // This will trigger our useVideoCache hook
    if (typeof window !== 'undefined') {
      console.log('Preloading intro video in background');
      // The hook will handle the actual caching
    }
    
    // Set up a refresh interval for leaderboard (every minute)
    const leaderboardInterval = setInterval(() => {
      fetchLeaderboard();
    }, 60000); // 60 seconds
    
    return () => clearInterval(leaderboardInterval);
  }, [fetchLeaderboard, fetchSessionsOnSameStage]);
  
  // Handle session changes
  useEffect(() => {
    // When session changes, refresh questions if in QnA mode
    if (mode === 'qna') {
      refreshAllQuestions();
    }
  }, [session.id, mode, refreshAllQuestions]);

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
  // Update this whenever session changes
  const qrCodeUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/qna/${session.id}`
    : `/qna/${session.id}`
    
  // Session navigation status text
  const sessionNavigationText = sessionsOnSameStage.length > 1 
    ? `Session ${currentSessionIndex + 1} of ${sessionsOnSameStage.length} on ${getFullStageName(session.stage)}` 
    : ""
  
  // Handle navigation visibility
  useEffect(() => {
    // Show navigation when session changes or component mounts
    setShowNavigation(true)
    
    // Hide navigation after 3 seconds
    const timer = setTimeout(() => {
      setShowNavigation(false)
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [session.id]) // Reset timer when session changes
  
  // Video caching for intro video
  const introVideoUrl = '/intro01.mp4'
  const { videoSrc, isLoaded } = useVideoCache(introVideoUrl)
  
  // If showing intro video
  if (mode === 'video') {
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 bg-black text-white">
        {!isLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <video
            className="w-full h-full object-cover"
            src={videoSrc}
            autoPlay
            muted={false}
            controls={false}
            onEnded={() => setMode('session')}
          />
        )}
      </div>
    )
  }
  
  // If showing leaderboard mode
  if (mode === 'leaderboard') {
    // Only show top 10 entries
    const topEntries = leaderboard.slice(0, 10);
    const totalParticipants = leaderboard.length;
    
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 bg-[#0d1117] text-white">
        <div className="container mx-auto px-4 py-6 flex flex-col h-screen">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-grow-0 pt-8 pb-4 text-center">
              <div className="flex items-center justify-center mb-4">
                <Trophy className="h-12 w-12 text-yellow-500 mr-4" />
                <h1 className="text-5xl font-bold">Q&A Leaderboard</h1>
              </div>
              <p className="text-xl text-gray-300 mb-4">Top contributors from the audience</p>
              {/* Session navigation indicator for leaderboard mode */}
              {sessionsOnSameStage.length > 1 && (
                <div className={`absolute left-1/2 transform -translate-x-1/2 bottom-4 py-2 px-4 bg-gray-800 rounded-lg border border-gray-700 transition-opacity duration-500 ${showNavigation ? 'opacity-100' : 'opacity-0'}`}>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">{sessionNavigationText}</span>
                    <br />
                    <span className="text-xs">
                      {currentSessionIndex > 0 && (
                        <span className="mr-3"><span className="inline-block bg-gray-700 rounded px-1 mr-1">←</span> Previous session</span>
                      )}
                      {currentSessionIndex < sessionsOnSameStage.length - 1 && (
                        <span><span className="inline-block bg-gray-700 rounded px-1 mr-1">→</span> Next session</span>
                      )}
                    </span>
                  </p>
                </div>
              )}
            </div>
            
            {/* Leaderboard content */}
            <div className="flex-grow flex items-center justify-center">
              <div className="w-full max-w-4xl">
                {leaderboardLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
                  </div>
                ) : (
                  <div className="bg-[#161b22] rounded-lg overflow-hidden">
                    {/* Header row */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-[#21262d] text-sm font-bold">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-4">Participant</div>
                      <div className="col-span-3 text-center">Questions</div>
                      <div className="col-span-3 text-center">Upvotes</div>
                      <div className="col-span-1 text-center">Score</div>
                    </div>
                    
                    {/* Leaderboard entries */}
                    {topEntries.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 text-xl">
                        No data available yet
                      </div>
                    ) : (
                      topEntries.map((entry: LeaderboardEntry, index: number) => (
                        <div 
                          key={entry.userId}
                          className={`grid grid-cols-12 gap-2 py-3 px-2 ${index % 2 === 0 ? 'bg-[#161b22]' : 'bg-[#1c2129]'} ${index < 3 ? 'border-l-4' : ''} ${
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
                      ))
                    )}
                    
                    {/* Total participants count */}
                    {totalParticipants > 0 && (
                      <div className="text-right p-3 text-gray-400 bg-[#21262d]">
                        Total participants: {totalParticipants}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Bottom section with scoring explanation */}
            <div className="flex-grow-0 flex justify-center items-center py-6">
              <div className="text-center">
                <div className="text-sm text-gray-400">
                  <p className="mb-1">• Each question with at least 1 vote: 3 points</p>
                  <p className="mb-1">• Each additional vote: 1 point</p>
                  <p>• Most voted question in a session: 5 bonus points</p>
                </div>
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
              <p className="text-xl text-gray-300 mb-2">{getFullStageName(session.stage)}</p>
              <p className="text-xl text-red-500">
                {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                {new Date(session.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              {/* Session navigation indicator for QnA mode */}
              {sessionsOnSameStage.length > 1 && (
                <div 
                  className={`absolute left-1/2 transform -translate-x-1/2 bottom-4 py-2 px-3 bg-gray-800 rounded-lg border border-gray-700 transition-opacity duration-500 ${showNavigation ? 'opacity-100' : 'opacity-0'}`}
                >
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">{sessionNavigationText}</span>
                    <br />
                    <span className="text-xs">
                      {currentSessionIndex > 0 && (
                        <span className="mr-2"><span className="inline-block bg-gray-700 rounded px-1 mr-1">←</span> Previous</span>
                      )}
                      {currentSessionIndex < sessionsOnSameStage.length - 1 && (
                        <span><span className="inline-block bg-gray-700 rounded px-1 mr-1">→</span> Next</span>
                      )}
                    </span>
                  </p>
                </div>
              )}
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
              <div className="mt-4 w-4/5">
                <p className="text-3xl font-medium mb-3">Scan to ask questions</p>
                <p className="text-xl text-gray-400">or go to {qrCodeUrl}</p>
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
          
          {/* Bottom section - Logo and Speakers */}
          <div className="flex-grow-0 flex justify-between pb-8 relative">
            {/* Akasha Logo - Bottom Left */}
            <div className="flex items-start">
              <div className="h-28 w-28 flex items-center justify-center">
                <img 
                  src="/Akasha_Logo_Text_White.png" 
                  alt="Akasha Logo" 
                  className="w-full object-contain" 
                />
              </div>
            </div>
            
            {/* Speakers - Bottom Right */}
            <div className="flex flex-row gap-6 justify-end items-start">
              {session.speakers && session.speakers.map((speaker, index) => (
                !speaker.isMultiple && (
                  <div key={index} className="flex flex-col items-center">
                    <Avatar className="mb-3 h-20 w-20 border-2 border-red-500">
                      {/* Try to find the speaker in our API data */}
                      {(() => {
                        const apiSpeaker = apiSpeakers.find((s) => s.name.toLowerCase() === speaker.name.toLowerCase());
                        const speakerImage = apiSpeaker ? apiSpeaker.photo : speaker.image?.replace("40&width=40", "200&width=200");
                        return <AvatarImage src={speakerImage} alt={speaker.name} speakerName={speaker.name} />;
                      })()}
                      <AvatarFallback className="text-xl">{speaker.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-lg font-medium text-white">{speaker.name}</span>
                    {speaker.title && <span className="text-sm text-gray-400 text-center">{speaker.title}</span>}
                  </div>
                )
              ))}
              {session.speakers && session.speakers.some((speaker) => speaker.isMultiple) && (
                <div className="flex flex-col items-center">
                  <Avatar className="mb-3 h-20 w-20 border-2 border-red-500">
                    <AvatarImage src="/placeholder.svg?height=200&width=200" alt="Multiple Speakers" speakerName="Multiple Speakers" />
                    <AvatarFallback className="text-xl">MS</AvatarFallback>
                  </Avatar>
                  <span className="text-lg font-medium text-white">Multiple Speakers</span>
                  <span className="text-sm text-gray-400 text-center">Various Organizations</span>
                </div>
              )}
            </div>
            
            {/* Session Navigation - Bottom Center, with fade effect */}
            {sessionsOnSameStage.length > 1 && (
              <div 
                className={`absolute left-1/2 transform -translate-x-1/2 bottom-0 py-2 px-4 bg-gray-800/80 rounded-t-lg border border-gray-700 text-center transition-opacity duration-500 ${showNavigation ? 'opacity-100' : 'opacity-0'}`}
              >
                <p className="text-base text-gray-200">
                  <span className="font-medium">{sessionNavigationText}</span>
                  <br />
                  <span className="text-sm">
                    {currentSessionIndex > 0 && (
                      <span className="mr-4"><span className="inline-block bg-gray-700 rounded px-2 py-1 mr-1">←</span> Previous session</span>
                    )}
                    {currentSessionIndex < sessionsOnSameStage.length - 1 && (
                      <span><span className="inline-block bg-gray-700 rounded px-2 py-1 mr-1">→</span> Next session</span>
                    )}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
