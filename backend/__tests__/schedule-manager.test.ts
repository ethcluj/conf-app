import { 
  processSchedule, 
  getSessionsFromGoogleSheet
} from '../src/schedule-manager';
import { fetchFromGoogleSheet, validateGoogleSheetsConfig } from '../src/google-sheets';
import { fetchPublicGoogleSheet } from '../src/direct-sheets-fetch';

// Import mock data
import { mockRawScheduleData } from './mocks/googleSheetsMock';

// Mock the imported modules
jest.mock('../src/google-sheets');
jest.mock('../src/direct-sheets-fetch');

// Mock environment variables
process.env.GOOGLE_SHEET_ID = 'test-sheet-id';
process.env.GOOGLE_SHEET_NAME = 'test-sheet-name';
process.env.GOOGLE_API_KEY = 'test-api-key';

describe('Schedule Manager Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mocks
    (fetchPublicGoogleSheet as jest.Mock).mockResolvedValue(mockRawScheduleData);
    (fetchFromGoogleSheet as jest.Mock).mockResolvedValue(mockRawScheduleData);
    jest.spyOn(require('../src/google-sheets'), 'validateGoogleSheetsConfig').mockReturnValue(true);
  });

    // We'll test the date parsing indirectly through the processSchedule function

  describe('processSchedule', () => {
    it('should process raw schedule data into sessions', () => {
      const sessions = processSchedule(mockRawScheduleData);
      
      // Check we have the right number of sessions
      // Note: The exact number depends on how consecutive sessions with the same title are merged
      expect(sessions.length).toBeGreaterThan(0);
      
      // Check session properties
      const firstSession = sessions[0];
      expect(firstSession.id).toBeDefined();
      expect(firstSession.title).toBeDefined();
      expect(firstSession.stage).toBeDefined();
      expect(firstSession.startTime).toBeDefined();
      expect(firstSession.endTime).toBeDefined();
    });

    it('should merge consecutive sessions with the same title', () => {
      // Create mock data with consecutive sessions of the same title
      const consecutiveMockData = [
        {
          timeSlot: '26 June 09:00',
          visible: true,
          stage: 'NA',
          title: 'Doors Open',
          speakers: '',
          description: 'Part 1',
          type: 'NA',
          track: 'NA',
          notes: ''
        },
        {
          timeSlot: '26 June 09:30',
          visible: true,
          stage: 'NA',
          title: 'Doors Open', // Same title as previous
          speakers: '',
          description: 'Part 2',
          type: 'NA',
          track: 'NA',
          notes: ''
        },
        {
          timeSlot: '26 June 10:00',
          visible: true,
          stage: 'Main',
          title: 'Opening Keynote', // Different title
          speakers: 'John Doe',
          description: 'Welcome',
          type: 'Keynote',
          track: 'Ethereum Roadmap',
          notes: ''
        }
      ];
      
      const sessions = processSchedule(consecutiveMockData);
      
      // Should have 2 sessions (Doors Open merged, Opening Keynote)
      expect(sessions).toHaveLength(2);
      
      // Check the merged session duration
      const doorsOpenSession = sessions.find(s => s.title === 'Doors Open');
      expect(doorsOpenSession).toBeDefined();
      
      // Calculate duration in minutes
      const start = new Date(doorsOpenSession!.startTime);
      const end = new Date(doorsOpenSession!.endTime);
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      
      // Should be 60 minutes (two 30-minute slots)
      expect(durationMinutes).toBe(60);
    });

    it('should handle empty input', () => {
      const sessions = processSchedule([]);
      expect(sessions).toEqual([]);
    });

    it('should filter out non-visible rows', () => {
      // Create mock data with some non-visible rows
      const mixedVisibilityData = [
        {
          timeSlot: '26 June 09:00',
          visible: true,
          stage: 'NA',
          title: 'Visible Session',
          speakers: '',
          description: '',
          type: 'NA',
          track: 'NA',
          notes: ''
        },
        {
          timeSlot: '26 June 09:30',
          visible: false, // Not visible
          stage: 'Main',
          title: 'Hidden Session',
          speakers: '',
          description: '',
          type: 'NA',
          track: 'NA',
          notes: ''
        }
      ];
      
      const sessions = processSchedule(mixedVisibilityData);
      
      // Should only have the visible session
      expect(sessions).toHaveLength(1);
      expect(sessions[0].title).toBe('Visible Session');
    });
  });

  describe('getSessionsFromGoogleSheet', () => {
    it('should fetch sessions using direct method first', async () => {
      const sessions = await getSessionsFromGoogleSheet('test-sheet-id', 'test-sheet-name', 'test-api-key');
      
      // Should call the direct fetch method
      expect(fetchPublicGoogleSheet).toHaveBeenCalledWith('test-sheet-id', 'test-sheet-name');
      
      // Should not call the Google Sheets API method if direct fetch succeeds
      expect(fetchFromGoogleSheet).not.toHaveBeenCalled();
      
      // Should return processed sessions
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should fall back to Google Sheets API if direct method fails', async () => {
      // Make the direct fetch method fail
      (fetchPublicGoogleSheet as jest.Mock).mockRejectedValueOnce(new Error('Direct fetch failed'));
      
      const sessions = await getSessionsFromGoogleSheet('test-sheet-id', 'test-sheet-name', 'test-api-key');
      
      // Should call the direct fetch method
      expect(fetchPublicGoogleSheet).toHaveBeenCalledWith('test-sheet-id', 'test-sheet-name');
      
      // Should call the Google Sheets API method as fallback
      expect(fetchFromGoogleSheet).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id',
        sheetName: 'test-sheet-name',
        apiKey: 'test-api-key'
      });
      
      // Should return processed sessions
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should handle case when both fetch methods fail', async () => {
      // Make both fetch methods fail
      (fetchPublicGoogleSheet as jest.Mock).mockRejectedValueOnce(new Error('Direct fetch failed'));
      (fetchFromGoogleSheet as jest.Mock).mockRejectedValueOnce(new Error('API fetch failed'));
      
      const sessions = await getSessionsFromGoogleSheet('test-sheet-id', 'test-sheet-name', 'test-api-key');
      
      // Should return an empty array
      expect(sessions).toEqual([]);
    });

    it('should use environment variables as defaults when not provided', async () => {
      // Call without parameters to use environment variables
      await getSessionsFromGoogleSheet();
      
      // Should call with env var values
      expect(fetchPublicGoogleSheet).toHaveBeenCalledWith(
        process.env.GOOGLE_SHEET_ID,
        process.env.GOOGLE_SHEET_NAME
      );
    });
  });
});
