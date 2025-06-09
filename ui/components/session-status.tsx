import { type Session } from "@/lib/data"
import { isSessionActive, isSessionPast, isSessionFuture } from "@/lib/time-utils"

interface SessionStatusProps {
  session: Session
}

export function SessionStatus({ session }: SessionStatusProps) {
  if (isSessionActive(session)) {
    return null // Removed the "Happening now" status indicator
  }

  if (isSessionPast(session)) {
    return null // Removed the "Ended" status indicator
  }

  if (isSessionFuture(session)) {
    return null // Removed the "Upcoming" status indicator
  }

  return null
}

