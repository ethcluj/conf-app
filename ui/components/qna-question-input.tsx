"use client"

import { Send, Pencil, LogOut } from "lucide-react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { type QnaUser } from "@/lib/qna-data"
import * as QnaApi from "@/lib/qna-api"
import { QnaLogoutModal } from "@/components/qna-logout-modal"

// List of funny and encouraging placeholder messages
const placeholderMessages = [
  "Got a burning question? Tap to join the conversation!",
  "Curious minds want to know... tap to ask!",
  "Your question could be the next big brain teaser!",
  "Don't be shy, your Ethereum knowledge wants out!",
  "Quick! While the speaker catches their breath...",
  "That question in your head? It's getting impatient!",
  "Tap here to unleash your inner crypto-curiosity!",
  "Smart contracts can't answer themselves... but you can ask!",
  "Your question might just break the blockchain (in a good way)!",
  "Even Vitalik had to ask questions once...",
  "That's a nice thought bubble you've got there. Share it?",
  "Questions are gas-free! Ask away!",
  "Your brain is mining a question... tap to broadcast it!",
  "This space is reserved for your brilliant question!",
  "Stuck on something? The community's here to help!",
  "That question won't answer itself... tap to ask!",
  "Be the hero who asks what everyone's thinking!",
  "Psst... got something to ask? Tap here!",
  "Turn that confusion into clarity - ask away!",
  "Your question could spark the next big idea!"
]

interface QuestionInputProps {
  onSubmit: (question: string) => void
  isAuthenticated: boolean
  onAuthRequest: () => void
  user: QnaUser
  maxLength?: number
  onUpdateDisplayName?: (newName: string) => void
  onLogout?: () => void
}

export function QnaQuestionInput({ 
  onSubmit, 
  isAuthenticated, 
  onAuthRequest, 
  user,
  maxLength = 280,
  onUpdateDisplayName,
  onLogout
}: QuestionInputProps) {
  const [question, setQuestion] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState(user.displayName)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  
  // Randomly select a placeholder message when component mounts
  const randomPlaceholder = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * placeholderMessages.length)
    return placeholderMessages[randomIndex]
  }, [])
  
  const handleSubmit = async () => {
    if (!question.trim()) return
    
    if (!isAuthenticated) {
      onAuthRequest()
      return
    }
    
    setIsSubmitting(true)
    try {
      // Submit the question using the provided callback
      await onSubmit(question)
      setQuestion("")
    } catch (error) {
      console.error('Error submitting question:', error)
      // Error handling is done at the parent component level
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const remainingChars = maxLength - question.length
  const isOverLimit = remainingChars < 0
  
  return (
    <div className="p-4">
      <QnaLogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          QnaApi.logout();
          if (onLogout) onLogout();
          setIsLogoutModalOpen(false);
        }}
      />
      <div className="container mx-auto max-w-md">
        {isAuthenticated && (
          <div className="flex items-center gap-2 mb-2">
            {isEditingName ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="flex-1 bg-[#0d1117] text-white rounded-md p-1 text-sm outline-none border border-[#30363d] focus:border-red-600"
                  placeholder="Enter display name"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (newDisplayName.trim() && onUpdateDisplayName) {
                      onUpdateDisplayName(newDisplayName.trim())
                    }
                    setIsEditingName(false)
                  }}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setNewDisplayName(user.displayName)
                    setIsEditingName(false)
                  }}
                  className="text-xs bg-[#21262d] hover:bg-[#30363d] text-white px-2 py-1 rounded"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center w-full">
                <div className="text-sm text-gray-400 font-medium truncate flex-1 flex items-center">
                  {user.displayName}
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-gray-400 hover:text-white p-1 ml-1"
                    aria-label="Edit display name"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  {onLogout && (
                    <button
                      onClick={() => setIsLogoutModalOpen(true)}
                      className="text-gray-400 hover:text-red-500 p-1 ml-2"
                      aria-label="Logout"
                    >
                      <LogOut className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={isAuthenticated ? "Ask a question..." : randomPlaceholder}
            className="flex-1 bg-[#0d1117] text-white rounded-md p-3 outline-none border border-[#30363d] focus:border-red-600 text-sm resize-none"
            rows={2}
            maxLength={maxLength}
            disabled={isSubmitting}
          />
          <Button
            onClick={handleSubmit}
            className="bg-red-600 hover:bg-red-700 text-white p-3 h-auto rounded-md disabled:opacity-50"
            disabled={!question.trim() || isSubmitting || isOverLimit}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex justify-end mt-1">
          <span className={`text-xs ${isOverLimit ? "text-red-500" : "text-gray-400"}`}>
            {remainingChars} characters remaining
          </span>
        </div>
      </div>
    </div>
  )
}
