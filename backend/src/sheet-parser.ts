import { Session, Speaker, SessionLevel, SessionTrack } from './sessions';

/**
 * Represents a row from the Google Sheet containing schedule data
 * 
 * This interface maps directly to the columns in the Google Sheet.
 * Each property corresponds to a specific column in the sheet.
 */
export interface RawScheduleRow {
  /** Time slot in format "DD Month HH:MM" (e.g., "26 June 13:00") */
  timeSlot: string;
  /** Whether this session should be visible in the app */
  visible: boolean;
  /** Stage where the session takes place ('Main', 'Tech', 'Biz', 'Work', 'NA') */
  stage: string;
  /** Session title */
  title: string;
  /** Semicolon-separated list of speaker names */
  speakers: string;
  /** Session description */
  description: string;
  /** Session type (e.g., 'Keynote', 'Panel', 'Workshop') */
  type: string;
  /** Session track (e.g., 'Builders Onboarding', 'Ethereum Roadmap') */
  track: string;
  /** Session level (e.g., 'Beginner', 'Intermediate', 'Advanced', 'For everyone') */
  level: string;
  /** Fixed session ID (manually maintained in Google Sheet) */
  sessionId?: string;
  /** Additional notes about the session (used in tests) */
  notes?: string;
}


/**
 * Map of tracks from CSV to the application's SessionTrack type
 * 
 * This mapping converts the track names in the Google Sheet to
 * the standardized SessionTrack type used in the application.
 */
export const trackMapping: Record<string, SessionTrack | undefined> = {
  'Builders Onboarding': 'Builders Onboarding',
  'Ethereum Roadmap': 'Ethereum Roadmap',
  'AI and Ethereum': 'AI and Ethereum',
  'Business on Ethereum': 'Business on Ethereum',
  'Usability and Adoption': 'Usability and Adoption',
  'Privacy': 'Privacy',
  'DeFi': 'DeFi',
  'Philosophy & Community': 'Philosophy & Community',
  'NA': 'NA'
};

/**
 * Process multiple speakers from a semicolon-separated string
 * 
 * Parses a string containing semicolon-separated speaker names and
 * converts it into an array of Speaker objects with placeholder images.
 * 
 * @param speakersString Semicolon-separated list of speaker names
 * @returns Array of Speaker objects
 */
export function processSpeakers(speakersString: string): Speaker[] {
  if (!speakersString || typeof speakersString !== 'string') {
    return [];
  }
  
  try {
    // Split by semicolon, trim whitespace, and filter out empty strings
    const speakerNames = speakersString.split(';')
      .map(s => s.trim())
      .filter(Boolean);
    
    if (speakerNames.length === 0) {
      return [];
    }
    
    // Create Speaker objects with placeholder images
    return speakerNames.map(name => ({
      name,
      image: '/placeholder.svg?height=40&width=40'
    }));
  } catch (error) {
    console.error('Error processing speakers string:', error);
    return [];
  }
}


/**
 * Ensure a string is a valid SessionTrack or return undefined
 * 
 * Maps a track string from the Google Sheet to a standardized SessionTrack.
 * 
 * @param track Track string from the Google Sheet
 * @returns Mapped SessionTrack or undefined if no mapping exists
 */
export function validateSessionTrack(track: string): SessionTrack | undefined {
  if (!track || typeof track !== 'string') {
    return undefined;
  }
  
  return trackMapping[track.trim()];
}
