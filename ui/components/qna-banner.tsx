"use client"

import { MessageCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function QnaBanner() {
  const [isVisible, setIsVisible] = useState(true)
  
  if (!isVisible) return null
  
  return (
    <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
      <div className="container mx-auto max-w-md">
        <div className="bg-[#21262d] rounded-lg p-4 shadow-lg border border-[#30363d] relative">
          <button 
            className="absolute top-2 right-2 text-gray-400"
            onClick={() => setIsVisible(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div className="flex items-center">
            <div className="bg-red-600 p-2 rounded-full mr-4">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-medium text-white">Q&A Feature Now Available!</h3>
              <p className="text-sm text-gray-300 mt-1">
                Ask questions during sessions and vote for your favorites
              </p>
            </div>
          </div>
          <div className="mt-3 flex space-x-3">
            <Link href="/qna/leaderboard" className="flex-1">
              <Button variant="outline" className="w-full border-[#30363d] hover:bg-[#30363d] text-white">
                Leaderboard
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button className="w-full bg-red-600 hover:bg-red-700">Try Now</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
