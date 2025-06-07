// Mock axios first, before any imports
jest.mock('axios');

import { refreshSpeakers, allSpeakers } from '../src/speakers';
import axios from 'axios';
import { mockSpeakerCSVData, mockSpeakerData } from './mocks/googleSheetsMock';

describe('Speakers Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the allSpeakers array before each test
    allSpeakers.length = 0;
    
    // Set up default axios mock for speakers data
    (axios.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: mockSpeakerCSVData
    });
    
    // Set up environment variables
    process.env.GOOGLE_SHEET_ID = 'test-sheet-id';
    process.env.GOOGLE_SPEAKERS_SHEET_NAME = 'test-speakers-sheet';
  });

  describe('parseCSVRow', () => {
    // We can't directly test the private function, but we can test its behavior
    // through the public function that uses it
    it('should correctly parse CSV rows with quoted fields', async () => {
      // Mock axios to return CSV with quoted fields
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: '"Name","Organization","Social","Photo","Visible","Bio"\n"John, Doe","Ethereum, Foundation","@johndoe","https://example.com/john.jpg","true","Bio with quotes"\n'
      });
      
      await refreshSpeakers();
      
      // The first speaker should have been parsed correctly
      expect(allSpeakers[0].name).toBe('John, Doe');
      expect(allSpeakers[0].org).toBe('Ethereum, Foundation');
      expect(allSpeakers[0].bio).toBe('Bio with quotes');
    });
  });

  describe('mapAndFilterSheetDataToSpeakerDetails', () => {
    it('should map CSV data to speaker objects and filter by visibility', async () => {
      await refreshSpeakers();
      
      // Should have 3 visible speakers (4th one is not visible)
      expect(allSpeakers).toHaveLength(3);
      
      // Check properties of first speaker
      expect(allSpeakers[0].name).toBe('John Doe');
      expect(allSpeakers[0].org).toBe('Ethereum Foundation');
      expect(allSpeakers[0].social).toBe('@johndoe');
      expect(allSpeakers[0].photo).toBe('https://example.com/john.jpg');
      expect(allSpeakers[0].visible).toBe(true);
      expect(allSpeakers[0].bio).toBe('Ethereum researcher');
      
      // Check that hidden speaker is not included
      const hiddenSpeaker = allSpeakers.find(s => s.name === 'Hidden Speaker');
      expect(hiddenSpeaker).toBeUndefined();
    });

    it('should handle empty or missing fields', async () => {
      // Mock axios to return CSV with missing fields
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: '"Name","Organization","Social","Photo","Visible","Bio"\n"Minimal Speaker","","","","true",""\n'
      });
      
      await refreshSpeakers();
      
      // Should have 1 speaker with minimal data
      expect(allSpeakers).toHaveLength(1);
      expect(allSpeakers[0].name).toBe('Minimal Speaker');
      expect(allSpeakers[0].org).toBe('');
      expect(allSpeakers[0].social).toBe('');
      expect(allSpeakers[0].photo).toBe('');
      expect(allSpeakers[0].bio).toBe('');
    });
  });

  describe('refreshSpeakers', () => {
    it('should fetch speaker data and update allSpeakers', async () => {
      const result = await refreshSpeakers();
      
      // Verify axios was called with the correct URL
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://docs.google.com/spreadsheets/d/test-sheet-id/gviz/tq?tqx=out:csv&sheet=test-speakers-sheet')
      );
      
      // Check that allSpeakers was updated
      expect(allSpeakers).toHaveLength(3);
      expect(allSpeakers[0].name).toBe('John Doe');
      
      // Check that the result matches allSpeakers
      expect(result).toBe(allSpeakers);
    });

    it('should handle API errors gracefully', async () => {
      // Mock axios to throw an error
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      const result = await refreshSpeakers();
      
      // Should return an empty array on error
      expect(result).toEqual([]);
      expect(allSpeakers).toEqual([]);
    });

    it('should handle missing environment variables', async () => {
      // Save original env vars
      const originalSheetId = process.env.GOOGLE_SHEET_ID;
      
      // Remove env var
      delete process.env.GOOGLE_SHEET_ID;
      
      const result = await refreshSpeakers();
      
      // Should return an empty array when GOOGLE_SHEET_ID is not set
      expect(result).toEqual([]);
      
      // Restore env vars
      process.env.GOOGLE_SHEET_ID = originalSheetId;
    });

    it('should handle non-200 status codes', async () => {
      // Mock axios to return a non-200 status
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 404,
        statusText: 'Not Found'
      });
      
      const result = await refreshSpeakers();
      
      // Should return an empty array on non-200 status
      expect(result).toEqual([]);
    });

    it('should handle empty or invalid CSV data', async () => {
      // Mock axios to return empty data
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: 'Header Row Only\n'
      });
      
      const result = await refreshSpeakers();
      
      // Should return an empty array for data with only header
      expect(result).toEqual([]);
    });
  });
});
