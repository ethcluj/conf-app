import { type Session, isSessionActive, isSessionPast, isSessionUpcoming } from "@/lib/data"

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

  if (isSessionUpcoming(session)) {
    return null // Removed the "Upcoming" status indicator
  }

  return null
}

