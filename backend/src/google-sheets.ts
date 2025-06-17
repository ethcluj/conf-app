import { google, sheets_v4 } from 'googleapis';
import { RawScheduleRow } from './sheet-parser';

/**
 * Google Sheets API configuration interface
 */
export interface GoogleSheetsConfig {
  apiKey?: string;
  spreadsheetId: string;
  sheetName: string;
}

/**
 * Fetches data from a Google Sheet using the Sheets API
 * 
 * @param config Google Sheets configuration object
 * @param range Optional range to fetch (defaults to A:I)
 * @returns Promise resolving to raw data as string arrays
 * @throws Error if the API request fails
 */
export async function fetchSheetData(
  config: GoogleSheetsConfig,
  range?: string
): Promise<any[][]> {
  try {
    // Initialize the Sheets API client
    const sheets = google.sheets({
      version: 'v4',
      auth: config.apiKey
    });

    // Get the sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: range ? `${config.sheetName}!${range}` : `${config.sheetName}!A:I`,
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      console.warn(`No data found in the Google Sheet: ${config.sheetName}`);
      return [];
    }

    return rows;
  } catch (error: any) {
    console.error(`Error fetching data from Google Sheet (${config.sheetName}):`, error.message);
    throw error.message ? new Error(error.message) : error;
  }
}

/**
 * Fetches schedule data from a Google Sheet and transforms it into RawScheduleRow objects
 * 
 * @param config Google Sheets configuration
 * @returns Promise resolving to an array of RawScheduleRow objects
 * @throws Error if the API request fails
 */
export async function fetchFromGoogleSheet(config: GoogleSheetsConfig): Promise<RawScheduleRow[]> {
  try {
    // Fetch all columns A through K to include all data
    const rows = await fetchSheetData(config, 'A:K');
    
    if (rows.length <= 1) {
      return []; // Return empty array if only header or no data
    }

    // Log the header row for reference
    console.log('Sheet header row:', rows[0]);
    
    // Skip the header row and convert to RawScheduleRow objects, filtering only visible rows
    return rows.slice(1)
      .map((row: any, index: number) => {
        // Ensure we have enough columns, pad with empty strings if needed
        const paddedRow = [...row];
        while (paddedRow.length < 11) { // Ensure we have all 11 columns (A-K)
          paddedRow.push('');
        }
        
        // Log specific rows for debugging
        if (index >= 2 && index <= 5) {
          console.log(`Raw row data for index ${index}:`, paddedRow);
        }

        // Get the session ID from column D (index 3)
        // If no ID is provided, use the row index as a fallback
        const sessionId = paddedRow[3] && paddedRow[3].trim() ? paddedRow[3].trim() : `${index+1}`;
        
        return {
          timeSlot: paddedRow[0] || '',
          visible: paddedRow[1] && paddedRow[1].trim().toLowerCase() === 'true',
          stage: paddedRow[2] || '',
          // Column D is now the ID, so we use it for sessionId
          title: paddedRow[4] || '', // Title moved to column E (index 4)
          speakers: paddedRow[5] || '', // Speakers moved to column F (index 5)
          description: paddedRow[6] || '', // Description moved to column G (index 6)
          type: paddedRow[7] || '', // Type moved to column H (index 7)
          track: paddedRow[8] || '', // Track moved to column I (index 8)
          level: paddedRow[9] || '', // Level moved to column J (index 9)
          // Notes would be in column K (index 10) but we don't need it in RawScheduleRow
          sessionId: sessionId
        };
      })
      .filter((row: any) => row.visible === true);
  } catch (error: any) {
    console.error('Error processing schedule data:', error.message);
    throw error;
  }
}

/**
 * Validates a Google Sheets configuration object
 * 
 * @param config The configuration object to validate
 * @returns True if the config is valid, false otherwise
 */
export function validateGoogleSheetsConfig(config: any): config is GoogleSheetsConfig {
  return (
    config !== null &&
    typeof config === 'object' &&
    typeof config.spreadsheetId === 'string' &&
    config.spreadsheetId.length > 0 &&
    typeof config.sheetName === 'string' &&
    config.sheetName.length > 0
  );
}
