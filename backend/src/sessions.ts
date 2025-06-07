/**
 * Sessions module for the ETHCluj conference app
 * 
 * This module provides types, interfaces, and functions for working with
 * conference sessions. It includes data structures and utilities for
 * fetching and managing session data from Google Sheets.
 */
import { getSessionsFromGoogleSheet } from './schedule-manager';

/**
 * Defines the difficulty level of a session
 * Used for filtering and displaying appropriate session badges
 */
export type SessionLevel = "For everyone" | "Beginner" | "Intermediate" | "Advanced"

/**
 * Color coding for session levels
 * Maps each session level to a specific color for UI display
 */
export type SessionLevelColor = "green" | "blue" | "orange" | "red"

/**
 * Categorizes sessions by track/topic
 * Used for filtering and organizing sessions by subject area
 */
export type SessionTrack = "Ethereum Roadmap" | "DeFi" | "Security" | "Development" | "Research" | "Community"

/**
 * Numeric representation of session difficulty
 * 1 = Beginner, 5 = Advanced
 */
export type SessionDifficulty = 1 | 2 | 3 | 4 | 5

/**
 * Represents a speaker at the conference
 * 
 * Contains basic information about a speaker including their name and image.
 * Additional fields like title can be included if available.
 */
export interface Speaker {
  /** Speaker's full name */
  name: string
  /** URL to the speaker's profile image */
  image: string
  /** Optional speaker's title or role */
  title?: string
  /** Indicates if this represents multiple speakers */
  isMultiple?: boolean
}

/**
 * Represents a conference session
 * 
 * Contains all information about a session including timing, speakers,
 * content details, and metadata for filtering and display.
 */
export interface Session {
  /** Unique identifier for the session */
  id: string
  /** ISO string for the session date */
  date: string
  /** ISO string for the session start time */
  startTime: string
  /** ISO string for the session end time */
  endTime: string
  /** Location/stage where the session takes place */
  stage: string
  /** Session title */
  title: string
  /** Array of speakers presenting at this session */
  speakers: Speaker[]
  /** Difficulty/experience level for the session */
  level: SessionLevel
  /** Color associated with the session level */
  levelColor: SessionLevelColor
  /** Optional detailed description of the session */
  description?: string
  /** Whether the session is marked as a favorite */
  isFavorite: boolean
  /** Optional track/category for the session */
  track?: SessionTrack
  /** Optional numeric difficulty rating (1-5) */
  difficulty?: SessionDifficulty
  /** Optional array of key takeaways from the session */
  learningPoints?: string[]
}

/**
 * Default conference days configuration
 * These values are used for testing and development purposes
 */
const today = new Date();
const conferenceStartDate = new Date(today);
conferenceStartDate.setHours(9, 0, 0, 0);
const conferenceDays = [
  conferenceStartDate, 
  new Date(conferenceStartDate.getTime() + 86400000), // Day 2 (+1 day)
  new Date(conferenceStartDate.getTime() + 2 * 86400000) // Day 3 (+2 days)
];

/**
 * Creates a new Session object with the provided parameters
 * 
 * This function handles the creation of Session objects with proper date/time
 * calculations and level color mapping. It ensures all required fields are
 * properly formatted and calculated.
 * 
 * @param id Unique identifier for the session
 * @param day Date object representing the day of the session
 * @param startHour Hour when the session starts (24-hour format)
 * @param startMinute Minute when the session starts
 * @param durationMinutes Duration of the session in minutes
 * @param stage Location/stage where the session takes place
 * @param title Session title
 * @param speakers Array of speakers for this session
 * @param level Session difficulty level
 * @param isFavorite Whether the session is marked as favorite (default: false)
 * @param description Optional detailed description of the session
 * @param track Optional track/category for the session
 * @param difficulty Optional numeric difficulty rating (1-5)
 * @param learningPoints Optional array of key takeaways
 * @returns A fully formed Session object
 */
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
  if (!id) {
    throw new Error('Session ID is required');
  }
  
  if (!day || !(day instanceof Date) || isNaN(day.getTime())) {
    console.warn(`Invalid day provided for session "${title}", using current date`);
    day = new Date();
  }
  
  // Validate time parameters
  if (typeof startHour !== 'number' || startHour < 0 || startHour > 23) {
    console.warn(`Invalid startHour for session "${title}", using 9 AM`);
    startHour = 9;
  }
  
  if (typeof startMinute !== 'number' || startMinute < 0 || startMinute > 59) {
    console.warn(`Invalid startMinute for session "${title}", using 0`);
    startMinute = 0;
  }
  
  if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
    console.warn(`Invalid durationMinutes for session "${title}", using 30`);
    durationMinutes = 30;
  }
  
  // Calculate start and end times
  const startTime = new Date(day);
  startTime.setHours(startHour, startMinute, 0, 0);
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);
  
  // Determine level color based on session level
  let levelColor: SessionLevelColor = "green";
  switch (level) {
    case "For everyone":
      levelColor = "green";
      break;
    case "Beginner":
      levelColor = "blue";
      break;
    case "Intermediate":
      levelColor = "orange";
      break;
    case "Advanced":
      levelColor = "red";
      break;
  }
  
  // Create and return the session object
  return {
    id,
    date: day.toISOString(),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    stage: stage || 'NA', // Use 'NA' as default if stage is not provided
    title: title || 'Untitled Session',
    speakers: Array.isArray(speakers) ? speakers : [],
    level,
    levelColor,
    isFavorite,
    description,
    track,
    difficulty,
    learningPoints,
  };
}

/**
 * Configuration for Google Sheets data source
 * 
 * These settings determine how session data is fetched from Google Sheets.
 * Environment variables can override these defaults.
 */
const DATA_SOURCE = 'google-sheet';

/**
 * Google Sheets configuration
 * 
 * GOOGLE_SHEET_ID: The ID of the Google Sheet containing session data
 * GOOGLE_SHEET_NAME: The name of the sheet tab containing session data
 * GOOGLE_API_KEY: Optional API key for authenticated access
 */
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Agenda  - APP - Visible';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * In-memory cache of all sessions
 * Will be populated from Google Sheets on first request and refreshed periodically
 */
export let allSessions: Session[] = [];

/**
 * Fetches session data from the configured data source
 * 
 * This function retrieves session data from Google Sheets using the
 * configured spreadsheet ID and sheet name. It handles errors gracefully
 * and returns an empty array if the fetch fails.
 * 
 * @returns Promise resolving to an array of Session objects
 */
async function getSessionData(): Promise<Session[]> {
  console.log('Fetching session data from Google Sheets...');
  
  // Validate required configuration
  if (!GOOGLE_SHEET_ID) {
    console.error('Cannot fetch sessions: GOOGLE_SHEET_ID environment variable is not set');
    return [];
  }
  
  try {
    // Fetch from Google Sheets
    console.log(`Using spreadsheet ID: ${GOOGLE_SHEET_ID}, sheet: ${GOOGLE_SHEET_NAME}`);
    const sessions = await getSessionsFromGoogleSheet(
      GOOGLE_SHEET_ID,
      GOOGLE_SHEET_NAME,
      GOOGLE_API_KEY
    );
    
    console.log(`Successfully fetched ${sessions.length} sessions`);
    return sessions;
  } catch (error: any) {
    console.error(`Error getting session data: ${error?.message || 'Unknown error'}`);
    if (error?.stack) {
      console.debug('Error stack:', error.stack);
    }
    return [];
  }
}

/**
 * Refreshes the in-memory session cache from the data source
 * 
 * This function fetches the latest session data and updates the in-memory cache.
 * It's designed to be called periodically to ensure the data is up to date.
 * 
 * @returns Promise resolving to an array of Session objects
 */
export async function refreshSessions(): Promise<Session[]> {
  console.log('Refreshing sessions data...');
  
  try {
    // Get the latest data
    const sessions = await getSessionData();
    
    // Update the in-memory cache
    const previousCount = allSessions.length;
    allSessions = sessions;
    
    console.log(`Sessions refreshed: ${previousCount} → ${sessions.length}`);
    return allSessions;
  } catch (error: any) {
    console.error(`Error during session refresh: ${error?.message || 'Unknown error'}`);
    
    // If we have existing data, return it instead of throwing
    if (allSessions.length > 0) {
      console.warn(`Using ${allSessions.length} cached sessions due to refresh failure`);
      return allSessions;
    }
    
    // Only throw if we have no existing data
    throw error;
  }
}
