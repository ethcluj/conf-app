// Session data and helpers moved from ui/lib/data.ts for the /sessions API endpoint
import { getSessionsFromGoogleSheet } from './schedule-manager';

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
  date: string // ISO string for serialization
  startTime: string // ISO string
  endTime: string // ISO string
  stage: string
  title: string
  speakers: Speaker[]
  level: SessionLevel
  levelColor: SessionLevelColor
  description?: string
  isFavorite: boolean
  track?: SessionTrack
  difficulty?: SessionDifficulty
  learningPoints?: string[]
}

// Conference days
const today = new Date()
const conferenceStartDate = new Date(today)
conferenceStartDate.setHours(9, 0, 0, 0)
const conferenceDays = [conferenceStartDate, new Date(conferenceStartDate.getTime() + 86400000), new Date(conferenceStartDate.getTime() + 2 * 86400000)]

export function createSession(
  id: string,
  day: Date,
  startHour: number,
  startMinute: number,
  durationMinutes: number,
  stage: string,
  title: string,
  speakers: Speaker[],
  level: SessionLevel,
  isFavorite = false,
  description?: string,
  track?: SessionTrack,
  difficulty?: SessionDifficulty,
  learningPoints?: string[],
): Session {
  const startTime = new Date(day)
  startTime.setHours(startHour, startMinute, 0, 0)
  const endTime = new Date(startTime)
  endTime.setMinutes(endTime.getMinutes() + durationMinutes)
  let levelColor: SessionLevelColor = "green"
  switch (level) {
    case "For everyone":
      levelColor = "green"
      break
    case "Beginner":
      levelColor = "blue"
      break
    case "Intermediate":
      levelColor = "orange"
      break
    case "Advanced":
      levelColor = "red"
      break
  }
  return {
    id,
    date: day.toISOString(),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    stage,
    title,
    speakers,
    level,
    levelColor,
    isFavorite,
    description,
    track,
    difficulty,
    learningPoints,
  }
}

// Configuration for Google Sheets data source
const DATA_SOURCE = 'google-sheet';

// Google Sheets configuration
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1r4Y7tWSdyRc-XIW21b9x8felxgBUDKikglFZTB61o5E';
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'APP';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Caching disabled to ensure we always get the latest data

// Get sessions from the configured data source or fallback to hardcoded
async function getSessionData(): Promise<Session[]> {
  try {
    // Fetch from Google Sheets
    const sessions = await getSessionsFromGoogleSheet(
      GOOGLE_SHEET_ID,
      GOOGLE_SHEET_NAME,
      GOOGLE_API_KEY
    );
    
    return sessions;
  } catch (error) {
    console.error('Error getting session data:', error);
    // Return empty array instead of falling back to hardcoded sessions
    return [];
  }
}

// Initialize with empty array, will be populated from Google Sheets
export let allSessions: Session[] = [];

// Function to refresh sessions from the data source
export async function refreshSessions(): Promise<Session[]> {
  try {
    allSessions = await getSessionData();
    return allSessions;
  } catch (error) {
    console.error('Error during session refresh:', error);
    throw error;
  }
}
