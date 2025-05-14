import { Session, Speaker, SessionLevel, SessionTrack, SessionLevelColor } from './sessions';

export interface RawScheduleRow {
  timeSlot: string;
  visible: boolean;
  stage: string;
  title: string;
  speakers: string;
  description: string;
  type: string;
  track: string;
  notes: string;
}

// Map stage names from the CSV to the ones used in the application
export const stageMapping: Record<string, string> = {
  'Main': 'Main Stage',
  'Tech': 'Dev Stage',
  'Biz': 'Biz Stage',
  'Work': 'Workshop',
  'NA': 'NA' // For breaks, etc.
};

// Map session types to session levels
export const typeToLevelMapping: Record<string, SessionLevel> = {
  'Keynote': 'For everyone',
  'Panel': 'Beginner',
  'Workshop': 'Intermediate',
  'NA': 'For everyone'
};

// Map tracks from CSV to the application's SessionTrack type
export const trackMapping: Record<string, SessionTrack | undefined> = {
  'Builders Onboarding': 'Development',
  'Ethereum Roadmap': 'Ethereum Roadmap',
  'AI and Ethereum': 'Research',
  'Business on Ethereum': 'Community',
  'Usability and Adoption': 'Community',
  'DeFi': 'DeFi',
  'NA': undefined
};

// This function has been removed as we're only using Google Sheets API now

// Process multiple speakers from a semicolon-separated string
export function processSpeakers(speakersString: string): Speaker[] {
  if (!speakersString) return [];
  
  const speakerNames = speakersString.split(';').map(s => s.trim()).filter(Boolean);
  
  if (speakerNames.length === 0) return [];
  
  if (speakerNames.length === 1) {
    return [{
      name: speakerNames[0],
      image: '/placeholder.svg?height=40&width=40'
    }];
  }
  
  // Multiple speakers
  return speakerNames.map(name => ({
    name,
    image: '/placeholder.svg?height=40&width=40'
  }));
}

// Map session type to difficulty level
export function mapTypeToDifficulty(type: string): number {
  switch (type) {
    case 'Keynote': return 1;
    case 'Panel': return 2;
    case 'Workshop': return 3;
    default: return 1;
  }
}

// Determine level color based on session level
export function getLevelColor(level: SessionLevel): SessionLevelColor {
  switch (level) {
    case 'For everyone': return 'green';
    case 'Beginner': return 'blue';
    case 'Intermediate': return 'orange';
    case 'Advanced': return 'red';
    default: return 'green';
  }
}

// Ensure a string is a valid SessionTrack or return undefined
export function validateSessionTrack(track: string): SessionTrack | undefined {
  return trackMapping[track];
}
