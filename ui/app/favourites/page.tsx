"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { allSessions, fetchAllSessions } from "@/lib/data"
import { SessionCard } from "@/components/session-card"
import { TimeIndicator } from "@/components/time-indicator"
import { ScrollHideHeader } from "@/components/scroll-hide-header"
import { toggleFavorite, getFavoriteIds } from "@/lib/favorites"

export default function FavouritesPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState(allSessions)
  const [loading, setLoading] = useState(true)

  // Load sessions and apply favorites on component mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true)
        const fetchedSessions = await fetchAllSessions()
        setSessions(fetchedSessions)
      } catch (error) {
        console.error('Error loading sessions:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadSessions()
  }, [])

  const handleSessionClick = (sessionId: string) => {
    router.push(`/session/${sessionId}`)
  }

  const handleToggleFavorite = (sessionId: string) => {
    // Use the toggleFavorite function from favorites.ts
    const newFavoriteStatus = toggleFavorite(sessionId)
    
    // Update local state to reflect the change
    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === sessionId ? { ...session, isFavorite: newFavoriteStatus } : session,
      ),
    )
  }

  const favouriteSessions = sessions
    .filter((session) => session.isFavorite)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  return (
    <div className="min-h-screen bg-[#0d1117] text-white pb-20">
      <ScrollHideHeader>
        <div className="container mx-auto max-w-md px-4 pt-6 pb-3">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Favourites</h1>
          </header>
        </div>
      </ScrollHideHeader>

      <div className="container mx-auto max-w-md px-4 pt-16">
        <div>
          <TimeIndicator />

          {favouriteSessions.length > 0 ? (
            <div className="space-y-4">
              {favouriteSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Star className="h-16 w-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-medium mb-2">No favourites yet</h3>
              <p className="text-gray-400">Mark sessions as favourites to see them here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

