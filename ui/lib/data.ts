import { format, addDays, isBefore, isAfter, isSameDay } from "date-fns"

// Create conference dates (3 days)
const today = new Date()
const conferenceStartDate = new Date(today)
// Set conference to start today
conferenceStartDate.setHours(9, 0, 0, 0)

export const conferenceDays = [conferenceStartDate, addDays(conferenceStartDate, 1), addDays(conferenceStartDate, 2)]

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

// Cache for sessions to avoid repeated API calls
let sessionsCache: Session[] | null = null;

// Fetch all sessions from backend API
const fetchAllSessions = async (): Promise<Session[]> => {
  if (sessionsCache) return sessionsCache;
  
  try {
    // Clear the cache to force a fresh fetch
    sessionsCache = null;
    
    // Use the absolute URL when accessing directly on port 3000
    // or the relative URL when going through Nginx
    const apiUrl = window.location.hostname === 'localhost' && window.location.port === '3000' 
      ? 'http://localhost:8080/api/sessions'
      : '/api/sessions';
      
    console.log('Fetching sessions from:', apiUrl);
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("Failed to fetch sessions");
    const data = await res.json();
    sessionsCache = data.map(hydrateSession);
    return sessionsCache;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }
}

// For backward compatibility with existing code
// This will be populated after the first fetch
export let allSessions: Session[] = [];

// Initialize sessions
// Force a refresh on page load
window.addEventListener('load', () => {
  console.log('Page loaded, refreshing sessions...');
  fetchAllSessions().then(sessions => {
    allSessions = sessions;
    console.log('Sessions refreshed:', allSessions.length);
  }).catch(error => {
    console.error("Failed to initialize sessions:", error);
  });
});

// Initial fetch
fetchAllSessions().then(sessions => {
  allSessions = sessions;
  console.log('Initial sessions loaded:', allSessions.length);
}).catch(error => {
  console.error("Failed to initialize sessions:", error);
});

// Session data is now fetched from the backend API
// See fetchAllSessions() function above

// Helper functions for session management
export const getSessionsByDay = async (day: Date): Promise<Session[]> => {
  const sessions = await fetchAllSessions();
  return sessions.filter((session) => isSameDay(session.date, day));
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

