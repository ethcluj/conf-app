import { 
  RawScheduleRow, 
  stageMapping, 
  typeToLevelMapping, 
  validateSessionTrack, 
  processSpeakers, 
  mapTypeToDifficulty,
  getLevelColor
} from './sheet-parser';
import { fetchFromGoogleSheet, validateGoogleSheetsConfig } from './google-sheets';
import { fetchPublicGoogleSheet } from './direct-sheets-fetch';
import { Session, SessionLevel, SessionTrack, createSession } from './sessions';

// The slot duration in minutes
const SLOT_DURATION = 30;

// Parse date and time from the time slot format (e.g., "26 June 13:00")
function parseDateTime(timeSlot: string): { day: Date, hour: number, minute: number } {
  try {
    // Split the time slot into date and time parts
    const parts = timeSlot.split(' ');
    // Format should be like "26 June 13:00"
    if (parts.length < 3) {
      throw new Error(`Invalid time slot format: ${timeSlot}`);
    }
    
    const day = parseInt(parts[0]);
    const month = parts[1];
    const timePart = parts[parts.length - 1];
    const [hour, minute] = timePart.split(':').map(Number);
    
    // Create date with current year
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear, getMonthIndex(month), day);
    date.setHours(0, 0, 0, 0); // Reset time part
    
    // Validate the date
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date created from: ${timeSlot}`);
    }
    
    return { day: date, hour, minute };
  } catch (error) {
    console.error(`Error parsing date time: ${timeSlot}`, error);
    // Return a fallback date - current date
    const fallbackDate = new Date();
    return {
      day: fallbackDate,
      hour: 12,
      minute: 0
    };
  }
}

// Convert month name to month index (0-based)
function getMonthIndex(month: string): number {
  const months: Record<string, number> = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3,
    'May': 4, 'June': 5, 'July': 6, 'August': 7,
    'September': 8, 'October': 9, 'November': 10, 'December': 11
  };
  return months[month] || 5; // Default to June if not found
}

// Process the raw schedule data into session objects
export function processSchedule(rawData: RawScheduleRow[]): Session[] {
  // Filter out rows where visible is false or missing, or stage is 'NA' and not visible
  // This prevents invisible breaks (Coffee, Lunch, etc.) from being included
  // Only allow breaks (Lunch, Coffee, Break) with stage 'NA' if visible; filter out all other 'NA' stage sessions
  const allowedBreakTitles = ['lunch', 'coffee', 'break'];
  const filteredData = rawData.filter(row => {
    if (!row.visible) return false;
    if (row.stage === 'NA') {
      const normalizedTitle = row.title.trim().toLowerCase();
      return allowedBreakTitles.includes(normalizedTitle);
    }
    return true;
  });
  
  // Group consecutive slots with the same title
  const sessions: Session[] = [];
  let currentSession: RawScheduleRow | null = null;
  let slotCount = 0;
  let sessionId = 1;
  
  for (let i = 0; i < filteredData.length; i++) {
    const row = filteredData[i];
    
    // Skip completely empty slots (no title, no stage, not visible)
    if (!row.title && (row.stage === 'NA' || !row.stage) && !row.visible) {
      // But end the current session if there is one
      if (currentSession) {
        sessions.push(createSessionFromRow(currentSession, slotCount, sessionId.toString()));
        sessionId++;
        currentSession = null;
        slotCount = 0;
      }
      continue;
    }
    
    // Include breaks (NA stage but with title)
    const isBreak = row.stage === 'NA' && row.title;
    
    // Start a new session if:
    // 1. We don't have a current session, or
    // 2. The current session has a different title than this row, or
    // 3. This is a break session (always treat as individual)
    if (!currentSession || currentSession.title !== row.title || isBreak) {
      // End previous session if it exists
      if (currentSession) {
        sessions.push(createSessionFromRow(currentSession, slotCount, sessionId.toString()));
        sessionId++;
      }
      
      // Start a new session
      currentSession = row;
      slotCount = 1;
    } else {
      // Continuing the same session, increment the slot count
      slotCount++;
    }
  }
  
  // Add the last session if there is one
  if (currentSession) {
    sessions.push(createSessionFromRow(currentSession, slotCount, sessionId.toString()));
  }
  
  return sessions;
}

// Create a Session object from a raw data row and slot count
function createSessionFromRow(row: RawScheduleRow, slotCount: number, id: string): Session {
  // Parse date and time info
  const { day, hour, minute } = parseDateTime(row.timeSlot);
  
  // Calculate duration based on slot count
  const durationMinutes = slotCount * SLOT_DURATION;
  
  // Map stage from CSV to application stage
  const stage = stageMapping[row.stage] || row.stage;
  
  // Determine session level based on type
  const level: SessionLevel = typeToLevelMapping[row.type] || 'For everyone';
  
  // Process speakers
  const speakers = processSpeakers(row.speakers);
  
  // Map track from CSV to application track
  const track = validateSessionTrack(row.track);
  
  // Map type to difficulty
  const difficulty = mapTypeToDifficulty(row.type);
  
  // Create the session object
  return createSession(
    id,
    day,
    hour,
    minute,
    durationMinutes,
    stage,
    row.title,
    speakers,
    level,
    false, // isFavorite
    row.description,
    track,
    difficulty as any, // Type casting to match expected type
    undefined // learningPoints
  );
}

// This function has been removed as we're only using Google Sheets API now

/**
 * Get sessions from a Google Sheet
 * @param spreadsheetId The ID of the Google Sheet
 * @param sheetName The name of the sheet tab
 * @param apiKey Optional Google API key
 * @returns Array of Session objects
 */
export async function getSessionsFromGoogleSheet(
  spreadsheetId: string,
  sheetName: string = 'Agenda  - APP - Visible',
  apiKey?: string
): Promise<Session[]> {
  try {
    const config = { spreadsheetId, sheetName, apiKey };
    
    if (!validateGoogleSheetsConfig(config)) {
      throw new Error('Invalid Google Sheets configuration');
    }
    
    try {
      // First try using the direct fetch method which bypasses caching
      const rawData = await fetchPublicGoogleSheet(spreadsheetId, sheetName);
      return processSchedule(rawData);
    } catch (directError) {
      // If the direct method fails, try the Google Sheets API
      const rawData = await fetchFromGoogleSheet(config);
      return processSchedule(rawData);
    }
  } catch (error: any) {
    console.error('Failed to fetch from Google Sheet:', error.message || error);
    return [];
  }
}
