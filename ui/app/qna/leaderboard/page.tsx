"use client"

import { useState, useEffect } from "react"
import { Trophy } from "lucide-react"
import { mockLeaderboard } from "@/lib/qna-data"

export default function QnaLeaderboard() {
  const [leaderboard, setLeaderboard] = useState(mockLeaderboard)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Simulate loading leaderboard data
    const timer = setTimeout(() => {
      setLeaderboard(mockLeaderboard)
      setIsLoading(false)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])

  const getLeaderPosition = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-500"
      case 1: return "bg-gray-400"
      case 2: return "bg-amber-700"
      default: return "bg-gray-700"
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="container mx-auto max-w-md px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Q&A Leaderboard</h1>
          <p className="text-sm text-gray-400">Top Questioners</p>
        </div>
      </div>

      <div className="container mx-auto max-w-md px-4">
        <div className="pb-16">
          <div className="bg-[#161b22] rounded-lg p-6 mb-6">
            <p className="text-center text-gray-400 text-sm mb-4">
              Recognizing attendees who ask the most engaging questions
            </p>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                {leaderboard.map((entry, index) => (
                  <div 
                    key={entry.userId}
                    className="flex items-center p-4 rounded-lg bg-[#21262d]"
                  >
                    <div 
                      className={`flex items-center justify-center h-8 w-8 rounded-full mr-4 text-white font-bold ${getLeaderPosition(index)}`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{entry.displayName}</div>
                      <div className="text-xs text-gray-400">
                        {entry.questionsAsked} questions · {entry.upvotesReceived} upvotes received
                      </div>
                    </div>
                    <div className="text-xl font-bold text-red-500">{entry.score}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-[#161b22] rounded-lg p-6">
            <h3 className="font-semibold mb-3">How scoring works</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <div className="h-4 w-4 rounded-full bg-red-600 mt-1 mr-2"></div>
                <span>+3 points for each question asked</span>
              </li>
              <li className="flex items-start">
                <div className="h-4 w-4 rounded-full bg-red-600 mt-1 mr-2"></div>
                <span>+1 point for each upvote received</span>
              </li>
              <li className="flex items-start">
                <div className="h-4 w-4 rounded-full bg-red-600 mt-1 mr-2"></div>
                <span>+5 points for most upvoted question in a session</span>
              </li>
            </ul>
            <div className="mt-4 p-4 bg-[#0d1117] rounded-md">
              <h4 className="font-medium mb-2 text-yellow-500">Prizes</h4>
              <p className="text-sm text-gray-300">
                Top 5 contributors will receive special ETHCluj swag and will be announced as winners at the closing ceremony on Saturday!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
