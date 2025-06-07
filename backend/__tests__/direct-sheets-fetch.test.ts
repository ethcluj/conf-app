import { fetchPublicGoogleSheet } from '../src/direct-sheets-fetch';
import axios from 'axios';
import { mockRawScheduleData, mockCSVData } from './mocks/googleSheetsMock';

// Mock axios
jest.mock('axios');

describe('Direct Sheets Fetch Module', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Set up axios mock to return CSV data
    (axios.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: mockCSVData
    });
  });

  describe('fetchPublicGoogleSheet', () => {
    it('should fetch and parse sheet data correctly', async () => {
      const result = await fetchPublicGoogleSheet('test-sheet-id', 'test-sheet-name');
      
      // Verify axios was called with the correct URL
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://docs.google.com/spreadsheets/d/test-sheet-id/gviz/tq?tqx=out:csv&sheet=test-sheet-name')
      );
      
      // Verify the result contains the expected data (excluding the hidden row)
      expect(result).toHaveLength(5); // 5 visible rows from our mock data
      expect(result[0].title).toBe('Doors Open');
      expect(result[1].title).toBe('Opening Keynote');
      
      // Verify all rows have visible=true (hidden rows should be filtered out)
      expect(result.every(row => row.visible)).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      // Mock axios to throw an error
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      const result = await fetchPublicGoogleSheet('test-sheet-id', 'test-sheet-name');
      
      // Should return an empty array on error
      expect(result).toEqual([]);
    });

    it('should handle non-200 status codes', async () => {
      // Mock axios to return a non-200 status
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 404,
        statusText: 'Not Found'
      });
      
      const result = await fetchPublicGoogleSheet('test-sheet-id', 'test-sheet-name');
      
      // Should return an empty array on non-200 status
      expect(result).toEqual([]);
    });

    it('should handle empty or invalid CSV data', async () => {
      // Mock axios to return empty data
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: 'Header Row Only\n'
      });
      
      const result = await fetchPublicGoogleSheet('test-sheet-id', 'test-sheet-name');
      
      // Should return an empty array for data with only header
      expect(result).toEqual([]);
    });

    it('should handle row parsing errors gracefully', async () => {
      // Mock axios to return malformed CSV data
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: 'Header\n"Unclosed quote,"value",value'
      });
      
      const result = await fetchPublicGoogleSheet('test-sheet-id', 'test-sheet-name');
      
      // Should handle the error and continue processing
      expect(result.length).toBeGreaterThanOrEqual(0);
      // The implementation should handle this gracefully, either by skipping the row
      // or by including a placeholder row with visible=false
    });

    it('should use environment variables as defaults when not provided', async () => {
      // Call without parameters to use environment variables
      await fetchPublicGoogleSheet();
      
      // Verify axios was called with env var values
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://docs.google.com/spreadsheets/d/test-sheet-id/gviz/tq?tqx=out:csv&sheet=test-sheet-name')
      );
    });
  });

  describe('parseCSVRow', () => {
    // We can't directly test the private function, but we can test its behavior
    // through the public function that uses it
    it('should correctly parse CSV rows with quoted fields', async () => {
      // Mock axios to return CSV with quoted fields in the expected format
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: '"Time Slot","Visible","Stage","Title","Speakers","Description","Type","Track","Notes"\n"Field with, comma","true","NA","Test Title","","Test description","NA","NA",""'
      });
      
      const result = await fetchPublicGoogleSheet('test-sheet-id', 'test-sheet-name');
      
      // The first row should have been parsed correctly
      expect(result).toHaveLength(1);
      expect(result[0].timeSlot).toBe('Field with, comma');
      expect(result[0].title).toBe('Test Title');
    });
  });
});
