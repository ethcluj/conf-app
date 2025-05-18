import axios from 'axios';

// Speaker details interface
export interface SpeakerDetails {
  name: string;
  org: string;
  social: string;
  photo: string;
  visible: boolean;
  bio: string;
}

// In-memory cache of speakers
export let allSpeakers: SpeakerDetails[] = [];

const EXPECTED_COLUMNS = 6;

// Parse a CSV row, handling quoted fields
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Fetch sheet as CSV and split into rows
async function fetchPublicSheetDataCSV(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const timestamp = new Date().getTime();
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&_t=${timestamp}`;
  const response = await axios.get(url);
  if (response.status !== 200) {
    console.error('Error fetching speakers sheet:', response.statusText);
    return [];
  }
  const lines = (response.data as string).split(/\r?\n/).filter(line => line.trim());
  return lines.map(parseCSVRow);
}

// Map raw CSV rows to SpeakerDetails and filter by visibility
function mapAndFilterSheetDataToSpeakerDetails(rows: string[][]): SpeakerDetails[] {
  if (rows.length <= 1) return [];
  const dataRows = rows.slice(1);
  const speakers = dataRows.map(row => {
    const cells = [...row];
    while (cells.length < EXPECTED_COLUMNS) cells.push('');
    const [name, org, social, photo, visibleStr, bio] = cells;
    return {
      name: name.trim(),
      org: org.trim(),
      social: social.trim(),
      photo: photo.trim(),
      visible: visibleStr.trim().toLowerCase() === 'true',
      bio: bio.trim(),
    };
  });
  return speakers.filter(s => s.visible);
}

// Refresh speakers data from Google Sheet
export async function refreshSpeakers(): Promise<SpeakerDetails[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SPEAKERS_SHEET_NAME || 'Speakers';
  if (!spreadsheetId) {
    console.error('GOOGLE_SHEET_ID is not set');
    return [];
  }
  try {
    const rows = await fetchPublicSheetDataCSV(spreadsheetId, sheetName);
    allSpeakers = mapAndFilterSheetDataToSpeakerDetails(rows);
    return allSpeakers;
  } catch (error) {
    console.error('Error refreshing speakers:', error);
    return [];
  }
}
