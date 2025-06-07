"use client"

import { ChevronUp, Trash2 } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { type QnaQuestion, formatRelativeTime } from "@/lib/qna-data"

interface QuestionCardProps {
  question: QnaQuestion
  onVote: (questionId: string) => void
  isAuthenticated: boolean
  onAuthRequest?: () => void
  currentUserId?: string
  onDelete?: (questionId: string) => void
}

export function QnaQuestionCard({ question, onVote, isAuthenticated, onAuthRequest, currentUserId, onDelete }: QuestionCardProps) {
  const [isVoting, setIsVoting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const isOwnQuestion = currentUserId && question.authorId === currentUserId
  
  const handleVoteClick = () => {
    if (!isAuthenticated) {
      onAuthRequest?.()
      return
    }
    
    setIsVoting(true)
    // In a real app, this would be an API call
    setTimeout(() => {
      onVote(question.id)
      setIsVoting(false)
    }, 300) // Simulating API delay
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }
  
  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(question.id)
    }
    setShowDeleteConfirm(false)
  }
  
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
  }
  
  return (
    <div className="rounded-lg bg-[#161b22] p-4 mb-4 relative">
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-[#161b22] bg-opacity-95 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center p-4">
            <p className="text-white mb-4">Are you sure you want to delete this question?</p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Yes
              </button>
              <button 
                onClick={handleCancelDelete}
                className="bg-[#21262d] hover:bg-[#30363d] text-white px-4 py-2 rounded-md text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-start gap-3">
        {/* Vote button */}
        <button 
          onClick={handleVoteClick}
          disabled={isVoting}
          className={cn(
            "flex flex-col items-center rounded-md py-1 px-3", 
            "transition-colors",
            question.hasUserVoted 
              ? "bg-red-600 text-white" 
              : "bg-[#21262d] text-gray-300 hover:bg-[#30363d]"
          )}
        >
          <ChevronUp className={cn(
            "h-4 w-4 mb-1",
            isVoting && "animate-pulse"
          )} />
          <span className="text-sm font-semibold">{question.votes}</span>
        </button>
        
        {/* Question content */}
        <div className="flex-1">
          <div className="flex justify-between">
            <p className="text-sm text-white mb-2 flex-1 pr-2">{question.content}</p>
            {isOwnQuestion && onDelete && (
              <button 
                onClick={handleDeleteClick}
                className="text-gray-400 hover:text-red-500 p-1 h-fit"
                aria-label="Delete question"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span className={isOwnQuestion ? "text-red-500" : ""}>
              {question.authorName}
            </span>
            <span>{formatRelativeTime(question.timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
