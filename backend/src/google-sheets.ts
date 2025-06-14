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
    const rows = await fetchSheetData(config);
    
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
        while (paddedRow.length < 9) {
          paddedRow.push('');
        }
        
        // Log specific rows for debugging (especially rows that might become session ID 3)
        if (index >= 2 && index <= 5) { // Check a range of rows that might include session ID 3
          console.log(`Raw row data for index ${index} (session ID ${index+1}):`, paddedRow);
        }

        return {
          timeSlot: paddedRow[0] || '',
          visible: paddedRow[1] && paddedRow[1].trim().toLowerCase() === 'true',
          stage: paddedRow[2] || '',
          title: paddedRow[3] || '',
          speakers: paddedRow[4] || '',
          description: paddedRow[5] || '',
          type: paddedRow[6] || '',
          track: paddedRow[7] || '',
          level: paddedRow[8] || ''
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
