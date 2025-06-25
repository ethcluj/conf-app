"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MessageCircle } from "lucide-react"
import Link from "next/link"
import { connectToSSE, disconnectFromSSE, onQuestionAdded, onQuestionDeleted, onVoteUpdated, onUserUpdated } from "@/lib/sse-client"
import { 
  getQuestionsBySession, 
  type QnaQuestion, 
  type QnaUser, 
  addQuestion,
  toggleVote,
  deleteQuestion 
} from "@/lib/qna-data"
import * as QnaApi from "@/lib/qna-api"
import { getSessionById, type Session } from "@/lib/data"
import { ScrollHideHeader } from "@/components/scroll-hide-header"
import { QnaQuestionCard } from "@/components/qna-question-card"
import { QnaQuestionInput } from "@/components/qna-question-input"
import { QnaAuthModal } from "@/components/qna-auth-modal"

export default function QnaPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [user, setUser] = useState<QnaUser>({ 
    id: '', 
    displayName: '', 
    isAuthenticated: false 
  })
  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<QnaQuestion[]>([])
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Refresh the entire question list from the server
  const refreshQuestions = useCallback(async () => {
    try {
      const updatedQuestions = await getQuestionsBySession(sessionId);
      setQuestions(updatedQuestions);
    } catch (error) {
      console.error('Error refreshing questions:', error);
    }
  }, [sessionId]);
  
  // Handle real-time question updates by refreshing the entire list
  const handleQuestionAdded = useCallback((_newQuestion: QnaQuestion) => {
    refreshQuestions();
  }, [refreshQuestions])

  // Handle real-time question deletion by refreshing the entire list
  const handleQuestionDeleted = useCallback((_event: { questionId: string }) => {
    refreshQuestions()
  }, [refreshQuestions])

  // Handle real-time vote updates by refreshing the entire list
  const handleVoteUpdated = useCallback((_event: { questionId: string, voteCount: number, voteAdded: boolean }) => {
    refreshQuestions()
  }, [refreshQuestions])

  // Handle user display name updates
  const handleUserUpdated = useCallback((event: { userId: string, displayName: string }) => {
    // Update questions with the new display name for this user
    setQuestions(prevQuestions => 
      prevQuestions.map(question => 
        question.authorId === event.userId 
          ? { ...question, authorName: event.displayName }
          : question
      )
    )
    
    // If this is the current user, update the user state too
    if (user.isAuthenticated && user.id === event.userId) {
      setUser(prevUser => ({
        ...prevUser,
        displayName: event.displayName
      }))
    }
  }, [user])

  // Load session data and check authentication status
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setIsLoading(true)
        
        // Get session details
        const sessionData = await getSessionById(sessionId)
        if (sessionData) {
          setSession(sessionData)
        }
        
        // First check if user is already authenticated with a valid auth token
        const authToken = localStorage.getItem('qna_auth_token')
        if (authToken) {
          try {
            // Only try to authenticate if there's an auth token
            const userData = await QnaApi.authenticateUser()
            setUser(userData)
          } catch (authError) {
            console.log('Auth token invalid or expired')
            // Clear invalid token
            localStorage.removeItem('qna_auth_token')
          }
        }
        
        // Get questions for this session AFTER authentication attempt
        // This ensures the auth token is included in the request if available
        const sessionQuestions = await getQuestionsBySession(sessionId)
        setQuestions(sessionQuestions)
        
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading session data:", error)
        setIsLoading(false)
      }
    }
    
    fetchSessionData()
  }, [sessionId])
  
  // Set up SSE connection for real-time updates
  useEffect(() => {
    if (!sessionId) return
    
    // Connect to SSE for this session
    connectToSSE(sessionId)
    
    // Register event handlers
    onQuestionAdded(handleQuestionAdded)
    onQuestionDeleted(handleQuestionDeleted)
    onVoteUpdated(handleVoteUpdated)
    onUserUpdated(handleUserUpdated)
    
    // Clean up on unmount
    return () => {
      disconnectFromSSE()
    }
  }, [sessionId, handleQuestionAdded, handleQuestionDeleted, handleVoteUpdated, handleUserUpdated])

  const handleVoteToggle = async (questionId: string) => {
    if (!user.isAuthenticated) {
      setIsAuthModalOpen(true)
      return
    }

    try {
      // Toggle the vote using the real API
      await toggleVote(questionId, sessionId)
      
      // Refresh the questions list to show the latest state
      await refreshQuestions()
    } catch (error) {
      console.error("Error toggling vote:", error)
      // Don't show an alert for vote errors to avoid disrupting the user experience
    }
  }
  
  const handleDeleteQuestion = async (questionId: string) => {
    if (!user.isAuthenticated) {
      setIsAuthModalOpen(true)
      return
    }

    try {
      // Delete the question using the real API
      await deleteQuestion(questionId, sessionId)
      
      // Refresh the questions list to show the latest state
      await refreshQuestions()
    } catch (error) {
      console.error("Error deleting question:", error)
      alert("Failed to delete question. You may only delete your own questions.")
    }
  }

  const handleQuestionSubmit = async (questionContent: string) => {
    if (!user.isAuthenticated) {
      setIsAuthModalOpen(true)
      return
    }
    
    try {
      // Show a temporary loading state by adding a placeholder question
      const tempId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      const tempQuestion: QnaQuestion = {
        id: tempId, // Temporary ID that won't conflict with server IDs
        sessionId,
        content: questionContent,
        authorName: user.displayName,
        authorId: user.id,
        votes: 0,
        timestamp: new Date(),
        hasUserVoted: false
      }
      
      // Add the temporary question to the UI immediately for better UX
      setQuestions(prevQuestions => {
        return [...prevQuestions, tempQuestion]
          .sort((a, b) => b.votes - a.votes || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      })
      
      // Send the question to the API
      await addQuestion(questionContent, sessionId)
      
      // Refresh the entire question list to get the server-side data
      await refreshQuestions()
    } catch (error) {
      console.error("Error submitting question:", error)
      alert("Failed to submit your question. Please try again.")
    }
  }

  const handleAuthenticate = async (email: string) => {
    try {
      // Use the real API to authenticate
      const userData = await QnaApi.authenticateUser(email)
      setUser(userData)
      
      // Refresh questions after authentication to get updated hasUserVoted status
      const updatedQuestions = await getQuestionsBySession(sessionId)
      setQuestions(updatedQuestions)
    } catch (error) {
      console.error("Authentication error:", error)
      // Show error message to user
      alert("Authentication failed. Please try again.")
    }
  }

  const handleAuthRequest = () => {
    setIsAuthModalOpen(true)
  }
  
  const handleUpdateDisplayName = async (newName: string) => {
    try {
      // Use the real API to update display name
      const updatedUser = await QnaApi.updateUserDisplayName(newName)
      setUser(updatedUser)
    } catch (error) {
      console.error("Error updating display name:", error)
      // Show error message to user
      alert("Failed to update display name. Please try again.")
    }
  }
  
  const handleLogout = async () => {
    // Call the API logout function to clear tokens
    QnaApi.logout()
    
    // Reset user state
    setUser({ 
      id: '', 
      displayName: '', 
      isAuthenticated: false 
    })
    
    try {
      // Directly fetch questions from the API without authentication
      // This ensures we get a fresh set of questions with no user-specific data
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/qna/questions/${sessionId}`, {
        headers: {
          'Content-Type': 'application/json'
          // No auth token or fingerprint here
        }
      })
      
      const data = await response.json()
      if (data.data) {
        // Process the questions to ensure hasUserVoted is false for all
        const freshQuestions = data.data.map((q: any) => ({
          id: q.id.toString(),
          sessionId: q.sessionId,
          content: q.content,
          authorName: q.authorName,
          authorId: q.authorId.toString(),
          votes: q.votes,
          timestamp: new Date(q.createdAt),
          hasUserVoted: q.hasUserVoted || false // Preserve hasUserVoted from API response
        }))
        
        // Update the questions state with the fresh data
        setQuestions(freshQuestions.sort((a: QnaQuestion, b: QnaQuestion) => 
          b.votes - a.votes || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ))
      }
    } catch (error) {
      console.error('Error refreshing questions after logout:', error)
      // Fallback to normal refresh if direct fetch fails
      refreshQuestions()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center">
        <p>Session not found</p>
        <Link href="/" className="mt-4 text-red-500 hover:text-red-400">
          Return to schedule
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col">
      <QnaAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticate={handleAuthenticate}
      />
      
      <ScrollHideHeader>
        <div className="container mx-auto max-w-md px-4 py-4">
          <div className="flex items-center">
            <Link href={`/session/${sessionId}`} className="mr-4">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold truncate">{session.title}</h1>
              <p className="text-sm text-gray-400">
                {session.stage} · Q&A
              </p>
            </div>
          </div>
        </div>
      </ScrollHideHeader>

      {/* Chat-like interface with fixed header and footer */}
      <div className="flex flex-col h-[calc(100vh-64px)] pt-16">
        {/* Messages area with auto scroll */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-40">
          <div className="container mx-auto max-w-md">
            {questions.length > 0 ? (
              <div className="space-y-4">
                {questions.map((question) => (
                  <QnaQuestionCard
                    key={question.id}
                    question={question}
                    onVote={handleVoteToggle}
                    isAuthenticated={user.isAuthenticated}
                    onAuthRequest={handleAuthRequest}
                    currentUserId={user.id}
                    onDelete={handleDeleteQuestion}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[50vh]">
                <div className="flex justify-center mb-4">
                  <MessageCircle className="h-16 w-16 text-gray-600 opacity-50" />
                </div>
                <h3 className="text-lg font-medium mb-2">No questions yet</h3>
                <p className="text-gray-400 text-sm text-center max-w-xs">
                  Be the first to ask a question using the input field below
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Input area fixed at bottom */}
        <div className="bg-[#161b22] border-t border-[#21262d]">
          <QnaQuestionInput
            onSubmit={handleQuestionSubmit}
            isAuthenticated={user.isAuthenticated}
            onAuthRequest={handleAuthRequest}
            user={user}
            onUpdateDisplayName={handleUpdateDisplayName}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </div>
  )
}
