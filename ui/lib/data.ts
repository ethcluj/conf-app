import { format, addDays, isBefore, isAfter, isSameDay } from "date-fns"

// Create conference dates (3 days)
// Set conference days to match the actual event dates (as in backend session data)
export const conferenceDays = [
  new Date('2025-06-26T00:00:00.000Z'),
  new Date('2025-06-27T00:00:00.000Z'),
  new Date('2025-06-28T00:00:00.000Z'),
]

export type SessionLevel = "For everyone" | "Beginner" | "Intermediate" | "Advanced"
export type SessionLevelColor = "green" | "blue" | "orange" | "red"
export type SessionTrack = "Ethereum Roadmap" | "DeFi" | "Security" | "Development" | "Research" | "Community"
export type SessionDifficulty = 1 | 2 | 3 | 4 | 5

export interface Speaker {
  name: string
  image: string
  title?: string
  isMultiple?: boolean
}

export interface Session {
  id: string
  date: Date
  startTime: Date
  endTime: Date
  stage: string
  title: string
  speakers: Speaker[]
  level: SessionLevel
  levelColor: SessionLevelColor
  description?: string
  isFavorite: boolean
  // Additional session details
  track?: SessionTrack
  difficulty?: SessionDifficulty
  learningPoints?: string[]
}

// Helper function to hydrate session objects from API (convert date strings to Date objects)
const hydrateSession = (session: any): Session => {
  return {
    ...session,
    date: new Date(session.date),
    startTime: new Date(session.startTime),
    endTime: new Date(session.endTime),
  };
}

// Fetch all sessions from backend API - no caching
export const fetchAllSessions = async (): Promise<Session[]> => {
  try {
    let apiUrl = '/api/sessions';
    if (typeof window !== 'undefined') {
      const isDev = process.env.NODE_ENV === 'development';
      const isLocalhost = window.location.hostname === 'localhost';
      if (isDev && isLocalhost) {
        apiUrl = 'http://localhost:3001/sessions';
      }
    }
    const res = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    if (!res.ok) throw new Error("Failed to fetch sessions");
    const data = await res.json();
    console.log('DEBUG_FETCH_RAW_SESSIONS', JSON.stringify(data));
    const hydrated = data.map(hydrateSession);
    console.log('DEBUG_FETCH_HYDRATED_SESSIONS', JSON.stringify(hydrated.map(s => ({id: s.id, date: s.date.toISOString(), startTime: s.startTime.toISOString(), endTime: s.endTime.toISOString()}))));
    return hydrated;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }
}

      

// For backward compatibility with existing code
// This will be populated after the first fetch
export let allSessions: Session[] = [];

// Refresh sessions on every page navigation/interaction
const refreshSessions = async () => {
  try {
    const sessions = await fetchAllSessions();
    allSessions = sessions;
  } catch (error) {
  }
};

// Client-side only code
if (typeof window !== 'undefined') {
  // Initialize sessions on page load
  window.addEventListener('load', refreshSessions);

  // Also refresh when user returns to the page
  window.addEventListener('focus', refreshSessions);

  // Initial fetch on client-side
  refreshSessions();
} else {
  // Server-side initialization - will be populated on client
}

// Session data is now fetched from the backend API
// See fetchAllSessions() function above

// Helper functions for session management
export const getSessionsByDay = async (day: Date): Promise<Session[]> => {
  const sessions = await fetchAllSessions();
  // Log the selected day and all hydrated session dates in ISO format
  console.log('DEBUG_FILTER_DAY', day.toISOString(), JSON.stringify(sessions.map(s => ({id: s.id, date: s.date.toISOString()}))));
  const filtered = sessions.filter((session) => isSameDay(session.date, day));
  // Log the filtered sessions (id and date)
  console.log('DEBUG_FILTER_RESULT', JSON.stringify(filtered.map(s => ({id: s.id, date: s.date.toISOString()}))));
  return filtered;
}

export const getCurrentAndUpcomingSessions = async (): Promise<Session[]> => {
  const now = new Date();
  const sessions = await fetchAllSessions();
  return sessions
    .filter((session) => isAfter(session.endTime, now))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export const getPastSessions = async (): Promise<Session[]> => {
  const now = new Date();
  const sessions = await fetchAllSessions();
  return sessions
    .filter((session) => isBefore(session.endTime, now))
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime()); // Most recent first
}

// These functions don't need to be async as they operate on a single session
export const isSessionActive = (session: Session): boolean => {
  const now = new Date();
  return isAfter(now, session.startTime) && isBefore(now, session.endTime);
}

export const isSessionUpcoming = (session: Session): boolean => {
  const now = new Date();
  return isAfter(session.startTime, now);
}

export const isSessionPast = (session: Session): boolean => {
  const now = new Date();
  return isBefore(session.endTime, now);
}

export const formatSessionTime = (session: Session): string => {
  return `${format(session.startTime, "HH:mm")} - ${format(session.endTime, "HH:mm")}`;
}

export const formatSessionDateTime = (session: Session): string => {
  return `${format(session.date, "MMMM d, yyyy")} • ${format(session.startTime, "HH:mm")} - ${format(session.endTime, "HH:mm")}`;
}

export const formatDayDate = (date: Date): string => {
  return format(date, "EEE, MMM d");
}

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
}

export const getSessionById = async (id: string): Promise<Session | undefined> => {
  const sessions = await fetchAllSessions();
  return sessions.find((session) => session.id === id);
}

