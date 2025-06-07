import { 
  RawScheduleRow, 
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

/**
 * Parse date and time from the time slot format (e.g., "26 June 13:00")
 * 
 * @param timeSlot String in format "DD Month HH:MM"
 * @returns Object containing day (Date), hour (number), and minute (number)
 */
function parseDateTime(timeSlot: string): { day: Date, hour: number, minute: number } {
  if (!timeSlot || typeof timeSlot !== 'string') {
    console.error('Invalid timeSlot provided:', timeSlot);
    return getFallbackDateTime();
  }
  
  try {
    // Split the time slot into date and time parts
    const parts = timeSlot.trim().split(' ');
    
    // Format should be like "26 June 13:00"
    if (parts.length < 3) {
      console.error(`Invalid time slot format: ${timeSlot} (expected format: "DD Month HH:MM")`);
      return getFallbackDateTime();
    }
    
    // Parse day, month, and time
    const day = parseInt(parts[0]);
    if (isNaN(day) || day < 1 || day > 31) {
      console.error(`Invalid day in time slot: ${parts[0]}`);
      return getFallbackDateTime();
    }
    
    const month = parts[1];
    const monthIndex = getMonthIndex(month);
    if (monthIndex === -1) {
      console.error(`Invalid month in time slot: ${month}`);
      return getFallbackDateTime();
    }
    
    const timePart = parts[parts.length - 1];
    const timeComponents = timePart.split(':');
    if (timeComponents.length !== 2) {
      console.error(`Invalid time format in time slot: ${timePart}`);
      return getFallbackDateTime();
    }
    
    const hour = parseInt(timeComponents[0]);
    const minute = parseInt(timeComponents[1]);
    
    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
      console.error(`Invalid hour or minute in time slot: ${timePart}`);
      return getFallbackDateTime();
    }
    
    // Create date with current year
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear, monthIndex, day);
    date.setHours(0, 0, 0, 0); // Reset time part
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.error(`Invalid date created from: ${timeSlot}`);
      return getFallbackDateTime();
    }
    
    return { day: date, hour, minute };
  } catch (error) {
    console.error(`Error parsing date time: ${timeSlot}`, error);
    return getFallbackDateTime();
  }
}

/**
 * Get a fallback date time object for error cases
 * 
 * @returns Default date time object
 */
function getFallbackDateTime(): { day: Date, hour: number, minute: number } {
  const fallbackDate = new Date();
  return {
    day: fallbackDate,
    hour: 12,
    minute: 0
  };
}

/**
 * Convert month name to month index (0-based)
 * 
 * @param month Month name (e.g., "January")
 * @returns Month index (0-11) or -1 if invalid
 */
function getMonthIndex(month: string): number {
  if (!month || typeof month !== 'string') {
    return -1;
  }
  
  const normalizedMonth = month.trim().toLowerCase();
  
  const months: Record<string, number> = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11
  };
  
  return months[normalizedMonth] !== undefined ? months[normalizedMonth] : -1;
}

/**
 * Process the raw schedule data into session objects
 * 
 * This function takes raw schedule data from Google Sheets and transforms it into
 * Session objects. It merges consecutive time slots with the same title into a single
 * session with the appropriate duration.
 * 
 * @param rawData Array of RawScheduleRow objects from the Google Sheet
 * @returns Array of Session objects ready for the API
 */
export function processSchedule(rawData: RawScheduleRow[]): Session[] {
  if (!rawData || !Array.isArray(rawData)) {
    console.error('Invalid raw data provided to processSchedule');
    return [];
  }
  
  console.log(`Processing schedule with ${rawData.length} raw rows`);
  
  try {
    // Filter out rows where visible is false
    // Note: We keep all visible rows including those with 'NA' stage
    const filteredData = rawData.filter(row => row.visible === true);
    
    console.log(`Filtered to ${filteredData.length} visible rows`);
    
    if (filteredData.length === 0) {
      console.warn('No visible sessions found in the schedule data');
      return [];
    }
    
    // Group consecutive slots with the same title
    const sessions: Session[] = [];
    let currentSession: RawScheduleRow | null = null;
    let slotCount = 0;
    let sessionId = 1;
    
    for (let i = 0; i < filteredData.length; i++) {
      const row = filteredData[i];
      
      // Skip completely empty slots (no title, no stage, not visible)
      if (!row.title && (row.stage === 'NA' || !row.stage)) {
        // But end the current session if there is one
        if (currentSession) {
          try {
            sessions.push(createSessionFromRow(currentSession, slotCount, sessionId.toString()));
            sessionId++;
            currentSession = null;
            slotCount = 0;
          } catch (error) {
            console.error('Error creating session:', error);
          }
        }
        continue;
      }
      
      // Start a new session if:
      // 1. We don't have a current session, or
      // 2. The current session has a different title than this row
      // Note: We merge all consecutive sessions with the same title, regardless of stage
      if (!currentSession || currentSession.title !== row.title) {
        // End previous session if it exists
        if (currentSession) {
          try {
            sessions.push(createSessionFromRow(currentSession, slotCount, sessionId.toString()));
            sessionId++;
          } catch (error) {
            console.error('Error creating session:', error);
          }
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
      try {
        sessions.push(createSessionFromRow(currentSession, slotCount, sessionId.toString()));
      } catch (error) {
        console.error('Error creating final session:', error);
      }
    }
    
    console.log(`Successfully created ${sessions.length} merged sessions`);
    return sessions;
  } catch (error) {
    console.error('Error processing schedule data:', error);
    return [];
  }
}

/**
 * Create a Session object from a raw data row and slot count
 * 
 * This function transforms a raw schedule row from the Google Sheet into a
 * properly formatted Session object for the API. It handles date/time parsing,
 * duration calculation, and various field mappings.
 * 
 * @param row The raw schedule row from the Google Sheet
 * @param slotCount Number of consecutive 30-minute slots this session spans
 * @param id Unique identifier for the session
 * @returns A fully formed Session object
 * @throws Error if required fields are missing or invalid
 */
function createSessionFromRow(row: RawScheduleRow, slotCount: number, id: string): Session {
  if (!row) {
    throw new Error('Cannot create session: row data is missing');
  }
  
  if (!id) {
    throw new Error('Cannot create session: id is required');
  }
  
  if (!row.timeSlot) {
    console.warn(`Session "${row.title || 'Untitled'}" (ID: ${id}) is missing timeSlot, using current time`);
  }
  
  // Validate slot count
  if (typeof slotCount !== 'number' || slotCount <= 0) {
    console.warn(`Invalid slot count for session "${row.title || 'Untitled'}" (ID: ${id}), defaulting to 1`);
    slotCount = 1;
  }
  
  try {
    // Parse date and time info
    const { day, hour, minute } = parseDateTime(row.timeSlot);
    
    // Calculate duration based on slot count
    const durationMinutes = slotCount * SLOT_DURATION;
    
    // Use raw stage value directly from Google Sheet
    // As per memory 2f71766a-682c-409f-8867-9849084122a2, we use raw stage values
    const stage = row.stage || 'NA';
    
    // Determine session level based on type
    const level: SessionLevel = typeToLevelMapping[row.type] || 'For everyone';
    
    // Process speakers
    const speakers = processSpeakers(row.speakers || '');
    
    // Map track from CSV to application track
    const track = validateSessionTrack(row.track || '');
    
    // Map type to difficulty
    const difficulty = mapTypeToDifficulty(row.type || '');
    
    // Create the session object
    return createSession(
      id,
      day,
      hour,
      minute,
      durationMinutes,
      stage,
      row.title || 'Untitled Session',
      speakers,
      level,
      false, // isFavorite
      row.description || '',
      track,
      difficulty as any, // Type casting to match expected type
      undefined // learningPoints
    );
  } catch (error) {
    console.error(`Error creating session from row (ID: ${id}):`, error);
    throw new Error(`Failed to create session from row (ID: ${id}): ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get sessions from a Google Sheet
 * 
 * This function fetches session data from a Google Sheet and processes it into
 * Session objects for the API. It first attempts to use the direct CSV fetch method,
 * and falls back to the Google Sheets API if that fails.
 * 
 * @param spreadsheetId The ID of the Google Sheet (defaults to GOOGLE_SHEET_ID env var)
 * @param sheetName The name of the sheet tab (defaults to GOOGLE_SHEET_NAME env var)
 * @param apiKey Optional Google API key (required only for fallback method)
 * @returns Promise resolving to an array of Session objects
 */
export async function getSessionsFromGoogleSheet(
  spreadsheetId: string = process.env.GOOGLE_SHEET_ID || '',
  sheetName: string = process.env.GOOGLE_SHEET_NAME || 'Agenda  - APP - Visible',
  apiKey?: string
): Promise<Session[]> {
  console.log('Fetching sessions from Google Sheet...');
  
  // Validate input parameters
  if (!spreadsheetId) {
    console.error('Cannot fetch sessions: spreadsheetId is required');
    return [];
  }
  
  if (!sheetName) {
    console.error('Cannot fetch sessions: sheetName is required');
    return [];
  }
  
  console.log(`Fetching from spreadsheet ID: ${spreadsheetId}, sheet: ${sheetName}`);
  
  try {
    const config = { spreadsheetId, sheetName, apiKey };
    
    // Validate configuration
    if (!validateGoogleSheetsConfig(config)) {
      throw new Error('Invalid Google Sheets configuration: spreadsheetId and sheetName are required');
    }
    
    let rawData: RawScheduleRow[] = [];
    let fetchMethod = '';
    
    try {
      // First try using the direct fetch method which bypasses caching
      console.log('Attempting direct CSV fetch method...');
      rawData = await fetchPublicGoogleSheet(spreadsheetId, sheetName);
      fetchMethod = 'direct CSV';
    } catch (directError: any) {
      // If the direct method fails, try the Google Sheets API
      console.warn(`Direct CSV fetch failed: ${directError?.message || 'Unknown error'}`);
      console.log('Falling back to Google Sheets API...');
      
      if (!apiKey && !process.env.GOOGLE_API_KEY) {
        console.error('Google API key is required for fallback method but was not provided');
        throw new Error('Google API key is required for fallback method');
      }
      
      rawData = await fetchFromGoogleSheet(config);
      fetchMethod = 'Google Sheets API';
    }
    
    console.log(`Successfully fetched ${rawData.length} raw rows using ${fetchMethod} method`);
    
    // Process the raw data into sessions
    const sessions = processSchedule(rawData);
    console.log(`Processed ${sessions.length} sessions from ${rawData.length} raw rows`);
    
    return sessions;
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    console.error(`Failed to fetch sessions from Google Sheet: ${errorMessage}`);
    
    // Provide more context in the error log
    if (error?.stack) {
      console.debug('Error stack:', error.stack);
    }
    
    return [];
  }
}
