"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MessageCircle } from "lucide-react"
import Link from "next/link"
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
        
        // Get questions for this session
        const sessionQuestions = await getQuestionsBySession(sessionId)
        setQuestions(sessionQuestions)
        
        // Check if user is already authenticated with a valid auth token
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
        
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading session data:", error)
        setIsLoading(false)
      }
    }
    
    fetchSessionData()
  }, [sessionId])

  const handleVote = async (questionId: string) => {
    if (!user.isAuthenticated) {
      setIsAuthModalOpen(true)
      return
    }

    try {
      // Toggle the vote using the real API
      await toggleVote(questionId, sessionId)
      
      // Refresh the questions list to ensure consistency
      const updatedQuestions = await getQuestionsBySession(sessionId)
      setQuestions(updatedQuestions)
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
      
      // Refresh the questions list to ensure consistency
      const updatedQuestions = await getQuestionsBySession(sessionId)
      setQuestions(updatedQuestions)
    } catch (error) {
      console.error("Error deleting question:", error)
      alert("Failed to delete question. You may only delete your own questions.")
    }
  }

  const handleQuestionSubmit = async (questionContent: string) => {
    if (!user.isAuthenticated || !session) return
    
    try {
      // Use the real API to add a question
      const newQuestion = await addQuestion(questionContent, sessionId)
      
      // After adding the question, refresh the questions list to ensure consistency
      const updatedQuestions = await getQuestionsBySession(sessionId)
      setQuestions(updatedQuestions)
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
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="container mx-auto max-w-md">
            {questions.length > 0 ? (
              <div className="space-y-4">
                {questions.map((question) => (
                  <QnaQuestionCard
                    key={question.id}
                    question={question}
                    onVote={handleVote}
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
          />
        </div>
      </div>
    </div>
  )
}
