import { google, sheets_v4 } from 'googleapis';
import { RawScheduleRow } from './sheet-parser';

// Google Sheets API configuration
interface GoogleSheetsConfig {
  apiKey?: string;
  spreadsheetId: string;
  sheetName: string;
}

/**
 * Fetches data from a Google Sheet using the Sheets API
 * @param config Google Sheets configuration
 * @returns Array of raw schedule rows
 */
export async function fetchFromGoogleSheet(config: GoogleSheetsConfig): Promise<RawScheduleRow[]> {
  try {
    // Initialize the Sheets API client
    const sheets = google.sheets({
      version: 'v4',
      auth: config.apiKey
    });

    // Get the sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!A:I`, // Columns A through I
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      console.warn('No data found in the Google Sheet');
      return [];
    }

    // Debug: log the first 5 rows of raw data
    console.log('[DEBUG] google-sheets.ts raw rows:', JSON.stringify(rows.slice(0, 6), null, 2));
    // Skip the header row and convert to RawScheduleRow objects, filtering only visible rows
    return rows.slice(1)
      .map((row: any) => {
        // Ensure we have enough columns, pad with empty strings if needed
        const paddedRow = [...row];
        while (paddedRow.length < 9) {
          paddedRow.push('');
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
          notes: paddedRow[8] || ''
        };
      })
      .filter((row: RawScheduleRow) => row.visible);
  } catch (error: any) {
    console.error('Error fetching data from Google Sheet:', error.message);
    throw error;
  }
}

/**
 * Validates a Google Sheets configuration
 * @param config The configuration to validate
 * @returns True if valid, false otherwise
 */
export function validateGoogleSheetsConfig(config: any): config is GoogleSheetsConfig {
  return (
    typeof config === 'object' &&
    typeof config.spreadsheetId === 'string' &&
    config.spreadsheetId.length > 0 &&
    typeof config.sheetName === 'string' &&
    config.sheetName.length > 0
  );
}
