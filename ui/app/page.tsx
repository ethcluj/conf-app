"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { allSessions, conferenceDays, getSessionsByDay, isSessionActive, isToday, fetchAllSessions } from "@/lib/data"
import { DateSelector } from "@/components/date-selector"
import { TimeIndicator } from "@/components/time-indicator"
import { SessionCard } from "@/components/session-card"
import { JumpToNow } from "@/components/jump-to-now"
import { ScrollHideHeader } from "@/components/scroll-hide-header"

export default function ConferenceSchedule() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today if it's a conference day, otherwise first day
    const today = new Date()
    const todayConferenceDay = conferenceDays.find((day) => isToday(day))
    return todayConferenceDay || conferenceDays[0]
  })

  const [activeTab, setActiveTab] = useState("All")
  const [sessions, setSessions] = useState(allSessions)
  const [sessionsForSelectedDay, setSessionsForSelectedDay] = useState<typeof allSessions>([])
  const [isLoading, setIsLoading] = useState(true)
  const currentSessionRef = useRef<HTMLDivElement>(null)
  
  // Fetch all sessions on component mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setIsLoading(true)
        const fetchedSessions = await fetchAllSessions()
        setSessions(fetchedSessions)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading sessions:', error)
        setIsLoading(false)
      }
    }
    
    loadSessions()
  }, [])
  
  // Update filtered sessions when selected date changes
  useEffect(() => {
    const filterSessionsByDay = async () => {
      try {
        const filteredSessions = await getSessionsByDay(selectedDate)
        setSessionsForSelectedDay(filteredSessions)
      } catch (error) {
        console.error('Error filtering sessions by day:', error)
        setSessionsForSelectedDay([])
      }
    }
    
    filterSessionsByDay()
  }, [selectedDate, sessions])

  const handleSessionClick = (sessionId: string) => {
    router.push(`/session/${sessionId}`)
  }

  const handleToggleFavorite = (sessionId: string) => {
    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === sessionId ? { ...session, isFavorite: !session.isFavorite } : session,
      ),
    )
  }

  const handleJumpToNow = () => {
    if (currentSessionRef.current) {
      currentSessionRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  const tabs = ["All", "Main", "Dev", "Biz", "Workshop"]

  // Filter sessions by category
  const filteredSessions =
    activeTab === "All"
      ? sessionsForSelectedDay
      : sessionsForSelectedDay.filter((session) => session.stage.includes(activeTab))

  // Sort sessions by start time
  const sortedSessions = filteredSessions.length > 0
    ? [...filteredSessions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    : []

  return (
    <div className="min-h-screen bg-[#0d1117] text-white pb-20">
      <ScrollHideHeader>
        <div className="container mx-auto max-w-md px-4 pt-6 pb-3">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">ETHCluj 2025</h1>
            <div className="w-1/2">
              <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
            </div>
          </header>

          <div className="mt-6 overflow-x-auto scrollbar-hide">
            <div className="flex rounded-lg bg-[#161b22] p-1 whitespace-nowrap">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium flex-shrink-0",
                    activeTab === tab ? "bg-red-600" : "text-gray-300",
                  )}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollHideHeader>

      <div className="container mx-auto max-w-md px-4">
        {/* Add padding to account for fixed header height */}
        <div className="pt-32">
          <TimeIndicator />

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : (
          <div className="space-y-4">
            {sortedSessions.length > 0 ? (
              sortedSessions.map((session) => (
                <div key={session.id} ref={isSessionActive(session) ? currentSessionRef : undefined}>
                  <SessionCard
                    session={session}
                    onClick={() => handleSessionClick(session.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No sessions found for this day and filter</p>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      <JumpToNow onJump={handleJumpToNow} />
    </div>
  )
}

