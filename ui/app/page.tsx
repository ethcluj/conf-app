"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SessionCard } from "@/components/session-card"
import { BreakSessionCard } from "@/components/break-session-card"
import { ScrollHideHeader } from "@/components/scroll-hide-header"
import { TimeIndicator } from "@/components/time-indicator"
import { DateSelector } from "@/components/date-selector"
import { JumpToNow } from "@/components/jump-to-now"
import { allSessions, refreshSessions, getSessionsByDay, conferenceDays, getStageDisplayName, fetchAllSessions } from "@/lib/data"
import { isSessionActive, isToday, getCurrentConferenceDay } from "@/lib/time-utils"
import { toggleFavorite } from "@/lib/favorites"
import { cn } from "@/lib/utils"

export default function ConferenceSchedule() {
  const router = useRouter()
  // Initialize with the first day as default, client-side effect will update if needed
  const [selectedDate, setSelectedDate] = useState(conferenceDays[0])
  
  // References for auto-scrolling
  const containerRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState("All")
  const [sessions, setSessions] = useState(allSessions)
  const [sessionsForSelectedDay, setSessionsForSelectedDay] = useState<typeof allSessions>([])
  const [isLoading, setIsLoading] = useState(true)
  const currentSessionRef = useRef<HTMLDivElement>(null)
  
  // Force client-side date selection after hydration
  useEffect(() => {
    const todayConferenceDay = conferenceDays.find((day) => isToday(day))
    if (todayConferenceDay) {
      setSelectedDate(todayConferenceDay)
    }
  }, [])

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
  
  // Auto-scroll to current session when sessions are loaded or changed
  useEffect(() => {
    if (!isLoading && currentSessionRef.current && containerRef.current) {
      // Use a small delay to ensure the DOM is fully rendered
      const timer = setTimeout(() => {
        currentSessionRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "center" 
        })
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [sessionsForSelectedDay, isLoading])

  const handleSessionClick = (sessionId: string) => {
    router.push(`/session/${sessionId}`)
  }

  const handleToggleFavorite = (sessionId: string) => {
    // Use the toggleFavorite function from favorites.ts
    const newFavoriteStatus = toggleFavorite(sessionId);
    
    // Update local state to reflect the change
    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === sessionId ? { ...session, isFavorite: newFavoriteStatus } : session,
      ),
    )
  }

  const handleJumpToNow = () => {
    // If there's a current active session, scroll to it
    if (currentSessionRef.current) {
      currentSessionRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    } else {
      // If no current session, check if we're on a conference day
      const currentDay = getCurrentConferenceDay();
      if (currentDay) {
        // If we're on a conference day but no active session, set the date to today
        setSelectedDate(currentDay);
      }
    }
  }

  const tabs = ["All", "Main", "Tech", "Biz", "Work"]

  // Separate break sessions (NA stage) from regular sessions
  const breakSessions = sessionsForSelectedDay.filter(session => session.stage === 'NA');
  const regularSessions = sessionsForSelectedDay.filter(session => session.stage !== 'NA');
  
  // Filter regular sessions by category
  const filteredRegularSessions =
    activeTab === "All"
      ? regularSessions
      : regularSessions.filter((session) => session.stage === activeTab);
      
  // Combine filtered regular sessions with break sessions (which appear in all tabs)
  // We need to deduplicate break sessions that happen at the same time
  const uniqueBreakSessions = breakSessions.reduce((unique, session) => {
    // Check if we already have a break session at this time
    const existingSessionIndex = unique.findIndex(s => 
      s.startTime.getTime() === session.startTime.getTime() && 
      s.endTime.getTime() === session.endTime.getTime()
    );
    
    if (existingSessionIndex === -1) {
      unique.push(session);
    }
    
    return unique;
  }, [] as typeof breakSessions);
  
  // Combine regular and break sessions
  const combinedSessions = [...filteredRegularSessions, ...uniqueBreakSessions];

  // Sort sessions by start time
  const sortedSessions = combinedSessions.length > 0
    ? [...combinedSessions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
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
                  {tab === "All" ? tab : getStageDisplayName(tab)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollHideHeader>

      <div className="container mx-auto max-w-md px-4" ref={containerRef}>
        {/* Add padding to account for fixed header height - ensure no overlap */}
        <div className="pt-32">
          <TimeIndicator />

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : (
          <div className="space-y-4 pb-20 pt-4">
            {sortedSessions.length > 0 ? (
              sortedSessions.map((session, index) => {
                // Find the first active session to assign the ref
                const isActive = isSessionActive(session);
                const isFirstActive = isActive && 
                  sortedSessions.findIndex(s => isSessionActive(s)) === index;
                  
                return (
                  <div key={session.id} ref={isFirstActive ? currentSessionRef : undefined}>
                    {session.stage === 'NA' ? (
                      <BreakSessionCard
                        session={session}
                        onClick={() => handleSessionClick(session.id)}
                        isActive={isActive}
                      />
                    ) : (
                      <SessionCard
                        session={session}
                        onClick={() => handleSessionClick(session.id)}
                        onToggleFavorite={handleToggleFavorite}
                        isActive={isActive}
                      />
                    )}
                  </div>
                );
              })
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

