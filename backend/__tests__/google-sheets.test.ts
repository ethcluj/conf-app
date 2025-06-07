import { fetchFromGoogleSheet, validateGoogleSheetsConfig } from '../src/google-sheets';
import { google } from 'googleapis';
import { mockGoogleSheetsResponse } from './mocks/googleSheetsMock';

// Mock googleapis
jest.mock('googleapis');

describe('Google Sheets Module', () => {
  let mockSheetsClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up Google API mocks
    mockSheetsClient = {
      spreadsheets: {
        values: {
          get: jest.fn().mockResolvedValue(mockGoogleSheetsResponse)
        }
      }
    };
    
    // Mock the sheets function
    (google.sheets as jest.Mock).mockReturnValue(mockSheetsClient);
  });

  describe('fetchFromGoogleSheet', () => {
    it('should fetch data using the Google Sheets API', async () => {
      const config = {
        spreadsheetId: 'test-sheet-id',
        sheetName: 'test-sheet-name',
        apiKey: 'test-api-key'
      };

      const result = await fetchFromGoogleSheet(config);

      // Verify Google Sheets API was called correctly
      expect(google.sheets).toHaveBeenCalledWith({
        version: 'v4',
        auth: 'test-api-key'
      });

      // Verify get method was called with correct parameters
      expect(mockSheetsClient.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id',
        range: 'test-sheet-name!A:I'
      });

      // Verify result processing
      expect(result).toHaveLength(5); // 5 visible rows from our mock data
      expect(result[0].title).toBe('Doors Open');
      expect(result[1].title).toBe('Opening Keynote');
      
      // Verify all rows have visible=true (hidden rows should be filtered out)
      expect(result.every(row => row.visible)).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      // Mock the API to throw an error
      mockSheetsClient.spreadsheets.values.get.mockRejectedValueOnce(new Error('API Error'));
      
      try {
        await fetchFromGoogleSheet({
          spreadsheetId: 'test-sheet-id',
          sheetName: 'test-sheet-name',
          apiKey: 'test-api-key'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('API Error');
      }
    });

    it('should handle empty response data', async () => {
      // Mock empty response
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({ data: {} });
      
      const result = await fetchFromGoogleSheet({
        spreadsheetId: 'test-sheet-id',
        sheetName: 'test-sheet-name',
        apiKey: 'test-api-key'
      });
      
      // Should return an empty array for empty response
      expect(result).toEqual([]);
    });

    it('should handle response with only headers', async () => {
      // Mock response with only headers
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ['Time Slot', 'Visible', 'Stage', 'Title', 'Speakers', 'Description', 'Type', 'Track', 'Notes']
          ]
        }
      });
      
      const result = await fetchFromGoogleSheet({
        spreadsheetId: 'test-sheet-id',
        sheetName: 'test-sheet-name',
        apiKey: 'test-api-key'
      });
      
      // Should return an empty array for data with only header
      expect(result).toEqual([]);
    });
  });

  describe('validateGoogleSheetsConfig', () => {
    it('should validate correct config objects', () => {
      const validConfig = {
        spreadsheetId: 'test-sheet-id',
        sheetName: 'test-sheet-name',
        apiKey: 'test-api-key'
      };
      
      expect(validateGoogleSheetsConfig(validConfig)).toBe(true);
      
      // API key is optional
      const validConfigNoApiKey = {
        spreadsheetId: 'test-sheet-id',
        sheetName: 'test-sheet-name'
      };
      
      expect(validateGoogleSheetsConfig(validConfigNoApiKey)).toBe(true);
    });

    it('should reject invalid config objects', () => {
      // Missing spreadsheetId
      expect(validateGoogleSheetsConfig({
        sheetName: 'test-sheet-name'
      } as any)).toBe(false);
      
      // Missing sheetName
      expect(validateGoogleSheetsConfig({
        spreadsheetId: 'test-sheet-id'
      } as any)).toBe(false);
      
      // Empty spreadsheetId
      expect(validateGoogleSheetsConfig({
        spreadsheetId: '',
        sheetName: 'test-sheet-name'
      })).toBe(false);
      
      // Empty sheetName
      expect(validateGoogleSheetsConfig({
        spreadsheetId: 'test-sheet-id',
        sheetName: ''
      })).toBe(false);
      
      // Not an object
      expect(validateGoogleSheetsConfig('not-an-object' as any)).toBe(false);
      
      // Test null and undefined separately to avoid TypeScript errors
      const nullConfig = null as any;
      expect(validateGoogleSheetsConfig(nullConfig)).toBe(false);
      
      const undefinedConfig = undefined as any;
      expect(validateGoogleSheetsConfig(undefinedConfig)).toBe(false);
    });
  });
});
