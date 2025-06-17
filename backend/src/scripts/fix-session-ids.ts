/**
 * Script to fix session IDs in the Google Sheet
 * 
 * This script reads the messed-up-ids.txt file and creates a mapping of session titles
 * to their desired fixed IDs. It then outputs instructions for updating the Google Sheet.
 */
import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';

// Configuration
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Agenda  - APP - Visible';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Path to the messed-up-ids.txt file
const messedUpIdsFilePath = path.join(__dirname, 'messed-up-ids.txt');

/**
 * Parse the messed-up-ids.txt file to extract session titles and their corresponding IDs
 * @returns A map of session titles to their desired IDs
 */
function parseMessedUpIdsFile(): Map<string, string> {
  const fileContent = fs.readFileSync(messedUpIdsFilePath, 'utf-8');
  const lines = fileContent.split('\n');
  const sessionMap = new Map<string, string>();

  // Process lines in pairs (title, URL)
  for (let i = 0; i < lines.length; i += 4) {
    const title = lines[i]?.trim();
    const urlLine = lines[i + 1]?.trim();

    if (title && urlLine && urlLine.startsWith('https://app.ethcluj.org/session/')) {
      // Extract the session ID from the URL
      const sessionId = urlLine.split('/').pop();
      if (sessionId) {
        sessionMap.set(title, sessionId);
        console.log(`Mapping session "${title}" to ID: ${sessionId}`);
      }
    }
  }

  return sessionMap;
}

/**
 * Fetch the current sessions from the Google Sheet
 * @returns Promise resolving to the raw sheet data
 */
async function fetchSessionsFromSheet(): Promise<any[][]> {
  if (!GOOGLE_SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID environment variable is not set');
  }

  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY environment variable is not set');
  }

  // Initialize the Sheets API client
  const sheets = google.sheets({
    version: 'v4',
    auth: GOOGLE_API_KEY
  });

  // Get the sheet data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${GOOGLE_SHEET_NAME}!A:J`, // Include the sessionId column (J)
  });

  const rows = response.data.values;
  
  if (!rows || rows.length === 0) {
    throw new Error('No data found in the Google Sheet');
  }

  return rows;
}

/**
 * Generate update instructions for the Google Sheet
 * @param sessionMap Map of session titles to their desired IDs
 * @param sheetData Raw data from the Google Sheet
 */
function generateUpdateInstructions(sessionMap: Map<string, string>, sheetData: any[][]): void {
  console.log('\n=== Google Sheet Update Instructions ===\n');
  console.log('Please add a new column J titled "Session ID" to your Google Sheet if it doesn\'t exist already.');
  console.log('Then update the following rows with their fixed session IDs:\n');

  // Skip the header row
  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (row.length >= 4) { // Make sure we have at least 4 columns (to get the title)
      const title = row[3]?.trim(); // Title is in column D (index 3)
      
      if (title && sessionMap.has(title)) {
        const fixedId = sessionMap.get(title);
        console.log(`Row ${i + 1}: "${title}" → Set Session ID (column J) to: ${fixedId}`);
      }
    }
  }

  console.log('\nAfter updating the Google Sheet, restart the backend to apply the changes.');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Parsing messed-up-ids.txt file...');
    const sessionMap = parseMessedUpIdsFile();
    console.log(`Found ${sessionMap.size} sessions to fix\n`);

    console.log('Fetching current sessions from Google Sheet...');
    const sheetData = await fetchSessionsFromSheet();
    console.log(`Fetched ${sheetData.length - 1} rows from the Google Sheet\n`);

    generateUpdateInstructions(sessionMap, sheetData);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main();
