import axios from 'axios';
import { RawScheduleRow } from './sheet-parser';

/**
 * Fetches data from a Google Sheet as CSV using the public sheets API
 * This works for publicly accessible sheets without requiring authentication
 * 
 * @param spreadsheetId The ID of the Google Sheet
 * @param sheetName The name of the sheet to fetch
 * @param range Optional range to fetch (e.g. "A:F")
 * @returns Promise resolving to a 2D array of string values
 */
export async function fetchPublicSheetDataCSV(
  spreadsheetId: string = process.env.GOOGLE_SHEET_ID || '',
  sheetName: string = process.env.GOOGLE_SHEET_NAME || ''
): Promise<string[][]> {
  try {
    if (!spreadsheetId) {
      console.error('Spreadsheet ID is required');
      return [];
    }
    
    if (!sheetName) {
      console.error('Sheet name is required');
      return [];
    }

    // Add timestamp to URL to bypass caching
    const timestamp = new Date().getTime();
    
    // URL for public Google Sheets
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&_t=${timestamp}`;
    
    const response = await axios.get(url);
    
    if (response.status !== 200) {
      console.error(`Failed to fetch sheet: ${response.statusText}`);
      return [];
    }
    
    // Parse CSV data
    const csvData = response.data;
    
    // Split into rows
    const rows = csvData.split('\n');
    
    if (rows.length === 0) {
      console.warn(`No data found in sheet: ${sheetName}`);
      return [];
    }
    
    // Parse each row into columns
    const parsedRows = rows.map(parseCSVRow);
    
    return parsedRows;
  } catch (error: any) {
    console.error(`Error fetching data from Google Sheet (${sheetName}):`, error.message);
    return [];
  }
}

/**
 * Fetch Google Sheet schedule data directly using the public sheets API
 * This works for publicly accessible sheets without requiring authentication
 * 
 * @param spreadsheetId The ID of the Google Sheet
 * @param sheetName The name of the sheet to fetch
 * @returns Promise resolving to an array of RawScheduleRow objects
 */
export async function fetchPublicGoogleSheet(
  spreadsheetId: string = process.env.GOOGLE_SHEET_ID || '',
  sheetName: string = process.env.GOOGLE_SHEET_NAME || 'Agenda  - APP - Visible'
): Promise<RawScheduleRow[]> {
  try {
    const rows = await fetchPublicSheetDataCSV(spreadsheetId, sheetName);
    
    if (rows.length <= 1) {
      return []; // Return empty array if only header or no data
    }
    
    // Skip the header row and parse the data rows
    const result = rows.slice(1).map((columns: string[], index: number) => {
      try {
        // Ensure we have enough columns, pad with empty strings if needed
        const paddedColumns = [...columns];
        while (paddedColumns.length < 9) {
          paddedColumns.push('');
        }
        
        // Ensure visible is a boolean
        const visibleValue = paddedColumns[1] ? 
          paddedColumns[1].trim().toLowerCase() === 'true' : false;
        
        return {
          timeSlot: paddedColumns[0] || '',
          visible: visibleValue,
          stage: paddedColumns[2] || '',
          title: paddedColumns[3] || '',
          speakers: paddedColumns[4] || '',
          description: paddedColumns[5] || '',
          type: paddedColumns[6] || '',
          track: paddedColumns[7] || '',
          notes: paddedColumns[8] || ''
        } as RawScheduleRow;
      } catch (error) {
        console.error(`Error parsing row ${index + 1}:`, error);
        // Return a placeholder for failed rows
        return {
          timeSlot: '',
          visible: false,
          stage: '',
          title: `[Error in row ${index + 1}]`,
          speakers: '',
          description: '',
          type: '',
          track: '',
          notes: ''
        } as RawScheduleRow;
      }
    });
    
    // Filter out non-visible rows
    return result.filter((row: RawScheduleRow) => row.visible);
  } catch (error: any) {
    console.error('Error in direct fetch from Google Sheet:', error.message);
    return [];
  }
}

/**
 * Simple CSV row parser that handles quoted fields
 * 
 * @param row The CSV row to parse
 * @returns Array of string values representing the columns
 */
export function parseCSVRow(row: string): string[] {
  if (!row || typeof row !== 'string') {
    return [];
  }

  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      // Add character to current field
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  // Clean up the data - remove quotes and trim
  return result.map(col => {
    let clean = col.trim();
    // Remove surrounding quotes if present
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.substring(1, clean.length - 1);
    }
    return clean;
  });
}
