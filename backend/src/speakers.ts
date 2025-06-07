import { fetchPublicSheetDataCSV } from './direct-sheets-fetch';

/**
 * Speaker details interface representing a conference speaker
 */
export interface SpeakerDetails {
  name: string;      // Speaker's full name
  org: string;       // Organization or company
  social: string;    // Social media link or website
  photo: string;     // URL to speaker's photo
  visible: boolean;  // Whether to display the speaker
  bio: string;       // Speaker's biography
}

// In-memory cache of speakers
export let allSpeakers: SpeakerDetails[] = [];

// Constants
const SPEAKERS_SHEET_COLUMN_RANGE = 'A:F';
const EXPECTED_COLUMNS = 6;

/**
 * Maps raw CSV rows to SpeakerDetails objects and filters by visibility
 * 
 * @param rows Array of string arrays representing CSV rows (including header)
 * @returns Array of SpeakerDetails objects for visible speakers only
 */
function mapAndFilterSheetDataToSpeakerDetails(rows: string[][]): SpeakerDetails[] {
  // Return empty array if there's no data or only a header row
  if (rows.length <= 1) {
    console.warn('No speaker data rows found in sheet');
    return [];
  }
  
  // Skip the header row
  const dataRows = rows.slice(1);
  
  // Map each row to a SpeakerDetails object
  const speakers = dataRows.map((row, index) => {
    try {
      // Ensure we have enough columns
      const cells = [...row];
      while (cells.length < EXPECTED_COLUMNS) cells.push('');
      
      // Destructure the cells
      const [name, org, social, photo, visibleStr, bio] = cells;
      
      // Parse and validate the visibility flag
      const isVisible = visibleStr ? visibleStr.trim().toLowerCase() === 'true' : false;
      
      return {
        name: name.trim(),
        org: org.trim(),
        social: social.trim(),
        photo: photo.trim(),
        visible: isVisible,
        bio: bio.trim(),
      };
    } catch (error) {
      console.error(`Error parsing speaker row ${index + 2}:`, error);
      // Return a placeholder with visible=false so it gets filtered out
      return {
        name: `[Error in row ${index + 2}]`,
        org: '',
        social: '',
        photo: '',
        visible: false,
        bio: ''
      };
    }
  });
  
  // Filter out non-visible speakers
  return speakers.filter(s => s.visible);
}

/**
 * Refreshes speaker data from Google Sheet
 * 
 * Fetches the latest speaker data from the configured Google Sheet,
 * processes it, and updates the in-memory cache.
 * 
 * @returns Promise resolving to an array of SpeakerDetails objects
 */
export async function refreshSpeakers(): Promise<SpeakerDetails[]> {
  console.log('Refreshing speakers data...');
  
  // Get configuration from environment variables
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SPEAKERS_SHEET_NAME || 'Speakers';
  
  // Validate required configuration
  if (!spreadsheetId) {
    console.error('Cannot refresh speakers: GOOGLE_SHEET_ID environment variable is not set');
    return allSpeakers; // Return existing data instead of empty array
  }
  
  try {
    // Fetch data from Google Sheet
    console.log(`Fetching speakers from sheet: ${sheetName}`);
    const rows = await fetchPublicSheetDataCSV(spreadsheetId, sheetName);
    
    // Process the data
    const speakers = mapAndFilterSheetDataToSpeakerDetails(rows);
    
    // Update the in-memory cache
    allSpeakers = speakers;
    console.log(`Successfully refreshed ${speakers.length} speakers`);
    
    return allSpeakers;
  } catch (error: any) {
    console.error('Error refreshing speakers data:', error?.message || 'Unknown error');
    
    // If we have existing data, return it instead of empty array
    if (allSpeakers.length > 0) {
      console.warn(`Using ${allSpeakers.length} cached speakers due to refresh failure`);
      return allSpeakers;
    }
    
    return [];
  }
}
