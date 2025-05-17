import axios from 'axios';
import { RawScheduleRow } from './sheet-parser';

/**
 * Fetch Google Sheet data directly using the public sheets API
 * This works for publicly accessible sheets without requiring authentication
 */
export async function fetchPublicGoogleSheet(
  spreadsheetId: string,
  sheetName: string
): Promise<RawScheduleRow[]> {
  try {
    // Add timestamp to URL to bypass caching
    const timestamp = new Date().getTime();
    // URL for public Google Sheets
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&_t=${timestamp}`;
    
    const response = await axios.get(url);
    
    if (response.status !== 200) {
      console.error('Error fetching sheet:', response.statusText);
      return [];
    }
    
    // Parse CSV data
    const csvData = response.data;
    
    // Split into rows and parse
    const rows = csvData.split('\n');
    // Debug: log the first 5 rows of CSV data
    console.log('[DEBUG] direct-sheets-fetch.ts raw CSV rows:', JSON.stringify(rows.slice(0, 6), null, 2));
    
    if (rows.length <= 1) {
      console.warn('No data rows found in the CSV');
      return [];
    }
    
    // Parse the CSV rows into objects
    // Skip the header row (index 0)
    const result = rows.slice(1).map((row: string, index: number) => {
      try {
        // Simple CSV parsing (this is a basic implementation)
        const columns = parseCSVRow(row);
        
        // Ensure we have enough columns, pad with empty strings if needed
        while (columns.length < 9) {
          columns.push('');
        }
        
        // Clean up the data - remove quotes and trim
        const cleanColumns = columns.map(col => {
          let clean = col.trim();
          // Remove surrounding quotes if present
          if (clean.startsWith('"') && clean.endsWith('"')) {
            clean = clean.substring(1, clean.length - 1);
          }
          return clean;
        });
        
        // No logging needed in production
        
        return {
          timeSlot: cleanColumns[0] || '',
          visible: cleanColumns[1] && cleanColumns[1].trim().toLowerCase() === 'true',
          stage: cleanColumns[2] || '',
          title: cleanColumns[3] || '',
          speakers: cleanColumns[4] || '',
          description: cleanColumns[5] || '',
          type: cleanColumns[6] || '',
          track: cleanColumns[7] || '',
          notes: cleanColumns[8] || ''
        };
      } catch (error) {
        console.error(`Error parsing row ${index + 1}:`, error);
        console.error('Row content:', row);
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
        };
      }
    });
    
    // Only allow visible rows, and for stage 'NA', only allow visible breaks (Lunch, Coffee, Break)
    const allowedBreakTitles = ['lunch', 'coffee', 'break'];
    return result.filter((row: RawScheduleRow) => {
      if (!row.visible) return false;
      if (row.stage === 'NA') {
        const normalizedTitle = row.title.trim().toLowerCase();
        return allowedBreakTitles.includes(normalizedTitle);
      }
      return true;
    });
  } catch (error: any) {
    console.error('Error in direct fetch from Google Sheet:', error.message);
    return [];
  }
}

/**
 * Simple CSV row parser that handles quoted fields
 */
function parseCSVRow(row: string): string[] {
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
  
  return result;
}
