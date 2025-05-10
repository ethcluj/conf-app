"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { allSessions } from "@/lib/data"
import { SessionCard } from "@/components/session-card"
import { TimeIndicator } from "@/components/time-indicator"

export default function FavouritesPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState(allSessions)

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

  const favouriteSessions = sessions
    .filter((session) => session.isFavorite)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  return (
    <div className="min-h-screen bg-[#0d1117] text-white pb-20">
      <div className="container mx-auto max-w-md px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Favourites</h1>
          <p className="text-gray-400 mt-1">Your favourite sessions</p>
        </header>

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
  )
}

