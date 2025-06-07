import { format, addDays, isBefore, isAfter, isSameDay } from "date-fns"
import { Speaker as ApiSpeaker } from "@/hooks/use-speakers"

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

// Map API speaker to UI speaker format
export const mapApiSpeakerToUiSpeaker = (apiSpeaker: ApiSpeaker): Speaker => {
  return {
    name: apiSpeaker.name,
    image: apiSpeaker.photo,
    title: apiSpeaker.org
  };
};

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

// Session level mapping to difficulty
const levelToDifficultyMapping: Record<SessionLevel, SessionDifficulty> = {
  "For everyone": 1,
  "Beginner": 2,
  "Intermediate": 3,
  "Advanced": 4
};

// Helper function to hydrate session objects from API
// Note: We treat API times as local times, ignoring timezone information
const hydrateSession = (session: any): Session => {
  // Determine session difficulty based on level or use default
  let sessionDifficulty: SessionDifficulty;
  
  if (session.difficulty) {
    sessionDifficulty = session.difficulty;
  } else if (session.level && typeof session.level === 'string' && session.level in levelToDifficultyMapping) {
    // Map from level if possible (with proper type checking)
    const level = session.level as SessionLevel;
    sessionDifficulty = levelToDifficultyMapping[level];
  } else {
    // Default to intermediate
    sessionDifficulty = 3;
  }
  
  // Parse dates treating them as local time
  // This ignores the timezone part of the ISO string
  const parseLocalTime = (dateStr: string) => {
    // Extract date parts from the ISO string, ignoring timezone
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return new Date(dateStr); // Fallback to standard parsing
    
    const [_, year, month, day, hours, minutes, seconds] = match;
    // Create date using local time components
    return new Date(
      parseInt(year), 
      parseInt(month) - 1, // Month is 0-indexed in JS Date
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
  };
  
  return {
    ...session,
    date: parseLocalTime(session.date),
    startTime: parseLocalTime(session.startTime),
    endTime: parseLocalTime(session.endTime),
    difficulty: sessionDifficulty,
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
    const hydrated = data.map(hydrateSession);
    return hydrated;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }
}

// For backward compatibility with existing code
// This will be populated after the first fetch
export let allSessions: Session[] = [];

// Refresh sessions function - simplified to avoid memory leaks
export const refreshSessions = async () => {
  try {
    const sessions = await fetchAllSessions();
    allSessions = sessions;
  } catch (error) {
    console.error("Error refreshing sessions:", error);
  }
};

// Client-side only code - initial fetch without event listeners
if (typeof window !== 'undefined') {
  // Initial fetch on client-side
  refreshSessions();
}

// Helper functions for session management
export const getSessionsByDay = async (day: Date): Promise<Session[]> => {
  const sessions = await fetchAllSessions();
  const filtered = sessions.filter((session) => isSameDay(session.date, day));
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
  // Format times in a.m./p.m. format with minutes, treating API times as local times
  // Convert to lowercase for better visual appearance
  const startTime = format(session.startTime, "h:mm a").toLowerCase();
  const endTime = format(session.endTime, "h:mm a").toLowerCase();
  return `${startTime} - ${endTime}`;
}

export const formatSessionDateTime = (session: Session): string => {
  const startTime = format(session.startTime, "h:mm a").toLowerCase();
  const endTime = format(session.endTime, "h:mm a").toLowerCase();
  return `${format(session.date, "MMMM d, yyyy")} • ${startTime} - ${endTime}`;
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

// Map stage codes to full stage names with floor information
export const getFullStageName = (stageCode: string, sessionTitle?: string): string => {
  // Special handling for break sessions (NA stage) based on title
  if (stageCode === 'NA' && sessionTitle) {
    const normalizedTitle = sessionTitle.toLowerCase().trim();
    
    if (normalizedTitle.includes('doors open')) {
      return 'Check-in Desk (ground floor)';
    } else if (normalizedTitle.includes('coffee')) {
      return 'Sponsors area (ground floor)';
    } else if (normalizedTitle.includes('lunch')) {
      return 'Cafeteria (1st floor)';
    }
  }
  
  // Default stage names
  switch (stageCode) {
    case 'Main':
      return 'Main Stage (3rd floor)';
    case 'Tech':
      return 'Tech Stage (1st floor)';
    case 'Biz':
      return 'Business Room (3rd floor)';
    case 'Work':
      return 'Workshop Room (3rd floor)';
    case 'NA':
      return 'All Stages';
    default:
      return stageCode;
  }
}

// Map stage codes to display names for the filter menu
export const getStageDisplayName = (stageCode: string): string => {
  switch (stageCode) {
    case 'Work':
      return 'Workshop';
    default:
      return stageCode;
  }
}

