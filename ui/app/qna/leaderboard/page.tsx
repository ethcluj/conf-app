"use client"

import { useState, useEffect } from "react"
import { Trophy, MessageSquare } from "lucide-react"
import * as QnaApi from "@/lib/qna-api"
import { formatRelativeTime } from "@/lib/qna-data"

export default function QnaLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<Array<{
    userId: string;
    displayName: string;
    score: number;
    questionsAsked: number;
    upvotesReceived: number;
  }>>([]) 
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    displayName: string;
    isAuthenticated: boolean;
  } | null>(null)
  const [userPosition, setUserPosition] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0)
  
  // Function to fetch leaderboard data and check user position
  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true)
      const leaderboardData = await QnaApi.getLeaderboard()
      setLeaderboard(leaderboardData)
      
      // Try to get authenticated user
      try {
        const user = await QnaApi.authenticateUser()
        setCurrentUser(user)
        
        // Find user position in leaderboard
        const position = leaderboardData.findIndex(entry => entry.userId === user.id)
        setUserPosition(position !== -1 ? position : null)
      } catch (error) {
        // User not authenticated, clear user data
        setCurrentUser(null)
        setUserPosition(null)
      }
      
      const now = new Date()
      setLastUpdated(now)
      setSecondsSinceUpdate(0)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      setIsLoading(false)
    }
  }
  
  // Initial fetch
  useEffect(() => {
    fetchLeaderboard()
    
    // Set up a refresh interval (every minute)
    const refreshInterval = setInterval(() => {
      fetchLeaderboard()
    }, 60000) // 60 seconds
    
    return () => clearInterval(refreshInterval)
  }, [])
  
  // Update the seconds counter
  useEffect(() => {
    if (!lastUpdated) return
    
    const timer = setInterval(() => {
      const now = new Date()
      const seconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000)
      setSecondsSinceUpdate(seconds)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [lastUpdated])

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
            <div className="flex justify-center mb-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-center text-gray-400 text-sm mb-4">
              Recognizing attendees who ask the most engaging questions
            </p>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                {/* Last updated indicator */}
                {lastUpdated && (
                  <div className="text-xs text-gray-400 text-right mb-2">
                    Updated {secondsSinceUpdate} seconds ago
                  </div>
                )}
                
                {leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No data available yet. Start asking questions to appear on the leaderboard!
                  </div>
                ) : (
                  <>
                    {/* Top 10 entries */}
                    {leaderboard.slice(0, 10).map((entry, index) => (
                      <div 
                        key={entry.userId}
                        className={`flex items-center py-2 px-3 rounded-lg ${entry.userId === currentUser?.id ? 'bg-[#2d3748] border border-red-500' : 'bg-[#21262d]'} mb-2`}
                      >
                        <div 
                          className={`flex items-center justify-center h-6 w-6 rounded-full mr-2 text-white font-bold text-xs ${getLeaderPosition(index)}`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="font-medium text-sm truncate">
                            {entry.displayName}
                            {entry.userId === currentUser?.id && (
                              <span className="ml-1 text-xs text-red-500">(You)</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {entry.questionsAsked} Q · {entry.upvotesReceived} upvotes
                          </div>
                        </div>
                        <div className="text-base font-bold text-red-500">{entry.score}</div>
                      </div>
                    ))}
                    
                    {/* Show user position if they're outside top 10 */}
                    {currentUser && userPosition !== null && userPosition >= 10 && (
                      <>
                        {userPosition > 10 && (
                          <div className="text-center text-gray-400 text-sm my-2">...</div>
                        )}
                        <div 
                          className="flex items-center py-2 px-3 rounded-lg bg-[#2d3748] border border-red-500 mb-2"
                        >
                          <div 
                            className="flex items-center justify-center h-6 w-6 rounded-full mr-2 text-white font-bold text-xs bg-gray-700"
                          >
                            {userPosition + 1}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="font-medium text-sm truncate">
                              {currentUser.displayName}
                              <span className="ml-1 text-xs text-red-500">(You)</span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {leaderboard[userPosition].questionsAsked} Q · {leaderboard[userPosition].upvotesReceived} upvotes
                            </div>
                          </div>
                          <div className="text-base font-bold text-red-500">{leaderboard[userPosition].score}</div>
                        </div>
                      </>
                    )}
                    
                    {/* Encouraging message for authenticated users with no questions */}
                    {currentUser && userPosition === null && (
                      <div className="mt-4 p-4 bg-[#2d3748] rounded-md border border-dashed border-yellow-500">
                        <p className="text-sm text-center">
                          <span className="text-yellow-500 font-medium">You haven't asked any questions yet!</span>
                          <br />
                          <span className="text-gray-300">Join the conversation by asking questions in sessions to appear on the leaderboard and earn points.</span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-[#161b22] rounded-lg p-6">
            <h3 className="font-semibold mb-3">How scoring works</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <div className="h-4 w-4 rounded-full bg-red-600 mt-1 mr-2"></div>
                <span>+3 for each question (min 1 vote)</span>
              </li>
              <li className="flex items-start">
                <div className="h-4 w-4 rounded-full bg-red-600 mt-1 mr-2"></div>
                <span>+1 for each additional vote</span>
              </li>
              <li className="flex items-start">
                <div className="h-4 w-4 rounded-full bg-red-600 mt-1 mr-2"></div>
                <span>+5 bonus for most voted question in a session</span>
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
