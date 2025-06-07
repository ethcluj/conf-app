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

// Counter to track distributed difficulties
let difficultyCounter = 0;

// Generate a session difficulty with equal distribution (1-5)
const getRandomDifficulty = (): SessionDifficulty => {
  // Cycle through all 5 difficulty levels to ensure equal distribution
  const difficulties: SessionDifficulty[] = [1, 2, 3, 4, 5];
  const difficulty = difficulties[difficultyCounter % 5];
  
  // Increment counter for next call
  difficultyCounter++;
  
  return difficulty;
};

// Helper function to hydrate session objects from API
// Note: We treat API times as local times, ignoring timezone information
const hydrateSession = (session: any): Session => {
  // DEBUG: Log original session data
  console.log('DEBUG_SESSION_BEFORE_HYDRATION', {
    id: session.id,
    title: session.title,
    level: session.level,
    levelColor: session.levelColor,
    difficulty: session.difficulty
  });
  
  // If session already has a difficulty, use it
  // Otherwise, try to map from level or use the distribution function
  let sessionDifficulty: SessionDifficulty;
  let difficultySource = 'unknown';
  
  if (session.difficulty) {
    sessionDifficulty = session.difficulty;
    difficultySource = 'existing';
  } else if (session.level && typeof session.level === 'string' && session.level in levelToDifficultyMapping) {
    // Map from level if possible (with proper type checking)
    const level = session.level as SessionLevel;
    sessionDifficulty = levelToDifficultyMapping[level];
    difficultySource = 'mapped-from-level';
  } else {
    // Use distributed random difficulty
    sessionDifficulty = getRandomDifficulty();
    difficultySource = 'random-distributed';
  }
  
  // DEBUG: Log difficulty assignment
  console.log('DEBUG_DIFFICULTY_ASSIGNMENT', {
    id: session.id,
    title: session.title,
    originalLevel: session.level,
    assignedDifficulty: sessionDifficulty,
    source: difficultySource
  });
  
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

// Force random session levels for testing
const forceRandomSessionLevels = (sessions: Session[]): Session[] => {
  const levels: SessionLevel[] = ["For everyone", "Beginner", "Intermediate", "Advanced"];
  
  return sessions.map((session, index) => {
    // Assign a level in rotation to ensure distribution
    const level = levels[index % levels.length];
    
    // Also assign a matching difficulty
    const difficulty = levelToDifficultyMapping[level];
    
    // Log what we're doing
    console.log('FORCING_RANDOM_LEVEL', {
      id: session.id,
      title: session.title,
      originalLevel: session.level,
      newLevel: level,
      newDifficulty: difficulty
    });
    
    return {
      ...session,
      level,
      difficulty
    };
  });
};

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
    let hydrated = data.map(hydrateSession);
    
    // Apply forced random levels for testing
    hydrated = forceRandomSessionLevels(hydrated);
    
    // Log final session data
    console.log('DEBUG_FINAL_SESSIONS', hydrated.map((s: Session) => ({
      id: s.id,
      title: s.title,
      level: s.level,
      difficulty: s.difficulty
    })));
    
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

