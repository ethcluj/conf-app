import { createSession, refreshSessions, allSessions, Speaker } from '../src/sessions';
import { getSessionsFromGoogleSheet } from '../src/schedule-manager';
import { mockRawScheduleData } from './mocks/googleSheetsMock';

// Mock the schedule manager
jest.mock('../src/schedule-manager');

describe('Sessions Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the allSessions array before each test
    allSessions.length = 0;
    
    // Set up default mock for getSessionsFromGoogleSheet
    const mockSessions = [
      {
        id: '1',
        date: '2023-06-26T00:00:00.000Z',
        startTime: '2023-06-26T09:00:00.000Z',
        endTime: '2023-06-26T09:30:00.000Z',
        stage: 'NA',
        title: 'Doors Open',
        speakers: [],
        level: 'For everyone',
        levelColor: 'green',
        isFavorite: false,
        description: 'Registration starts',
        track: undefined,
        difficulty: 1,
        learningPoints: undefined
      },
      {
        id: '2',
        date: '2023-06-26T00:00:00.000Z',
        startTime: '2023-06-26T10:00:00.000Z',
        endTime: '2023-06-26T10:30:00.000Z',
        stage: 'Main',
        title: 'Opening Keynote',
        speakers: [{ name: 'John Doe', image: '/placeholder.svg?height=40&width=40' }],
        level: 'For everyone',
        levelColor: 'green',
        isFavorite: false,
        description: 'Welcome to ETHCluj',
        track: 'Ethereum Roadmap',
        difficulty: 1,
        learningPoints: undefined
      }
    ];
    
    (getSessionsFromGoogleSheet as jest.Mock).mockResolvedValue(mockSessions);
  });

  describe('createSession', () => {
    it('should create a session object with correct properties', () => {
      const day = new Date('2023-06-26');
      const session = createSession(
        '1',
        day,
        9,
        0,
        30,
        'Main',
        'Test Session',
        [{ name: 'Test Speaker', image: '/test.jpg' }],
        'Beginner',
        false,
        'Test description',
        'Development',
        3,
        ['Learning point 1', 'Learning point 2']
      );
      
      // Check basic properties
      expect(session.id).toBe('1');
      expect(session.title).toBe('Test Session');
      expect(session.stage).toBe('Main');
      expect(session.description).toBe('Test description');
      
      // Check date and time properties
      expect(session.date).toBe(day.toISOString());
      
      const startTime = new Date(session.startTime);
      expect(startTime.getHours()).toBe(9);
      expect(startTime.getMinutes()).toBe(0);
      
      const endTime = new Date(session.endTime);
      expect(endTime.getHours()).toBe(9);
      expect(endTime.getMinutes()).toBe(30);
      
      // Check speakers
      expect(session.speakers).toHaveLength(1);
      expect(session.speakers[0].name).toBe('Test Speaker');
      
      // Check level and color
      expect(session.level).toBe('Beginner');
      expect(session.levelColor).toBe('blue');
      
      // Check other properties
      expect(session.track).toBe('Development');
      expect(session.difficulty).toBe(3);
      expect(session.learningPoints).toEqual(['Learning point 1', 'Learning point 2']);
    });

    it('should assign correct level colors for each level', () => {
      const day = new Date('2023-06-26');
      
      // For everyone -> green
      const session1 = createSession('1', day, 9, 0, 30, 'Main', 'Session 1', [], 'For everyone');
      expect(session1.levelColor).toBe('green');
      
      // Beginner -> blue
      const session2 = createSession('2', day, 9, 0, 30, 'Main', 'Session 2', [], 'Beginner');
      expect(session2.levelColor).toBe('blue');
      
      // Intermediate -> orange
      const session3 = createSession('3', day, 9, 0, 30, 'Main', 'Session 3', [], 'Intermediate');
      expect(session3.levelColor).toBe('orange');
      
      // Advanced -> red
      const session4 = createSession('4', day, 9, 0, 30, 'Main', 'Session 4', [], 'Advanced');
      expect(session4.levelColor).toBe('red');
    });
    
    it('should throw error when session ID is not provided', () => {
      const day = new Date('2023-06-26');
      
      expect(() => {
        // @ts-ignore - Deliberately passing invalid parameters for testing
        createSession(
          '', // Empty ID
          day,
          9,
          0,
          30,
          'Main',
          'Test Session',
          [],
          'Beginner'
        );
      }).toThrow('Session ID is required');
    });
    
    it('should handle invalid day parameter', () => {
      // Spy on console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Create an invalid date object for testing
      const invalidDate = new Date('invalid-date');
      
      const session = createSession(
        '1',
        invalidDate, // Invalid day (NaN date)
        9,
        0,
        30,
        'Main',
        'Test Session',
        [],
        'Beginner'
      );
      
      // Should have logged a warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid day provided for session "Test Session"')
      );
      
      // Should have used current date as fallback
      expect(new Date(session.date).getDate()).toBe(new Date().getDate());
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should handle invalid time parameters', () => {
      const day = new Date('2023-06-26');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // @ts-ignore - Deliberately passing invalid parameters for testing
      const session = createSession(
        '1',
        day,
        -1, // Invalid hour
        60, // Invalid minute
        -30, // Invalid duration
        'Main',
        'Test Session',
        [],
        'Beginner'
      );
      
      // Should have logged warnings
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid startHour for session "Test Session"')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid startMinute for session "Test Session"')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid durationMinutes for session "Test Session"')
      );
      
      // Should have used fallback values
      const startTime = new Date(session.startTime);
      expect(startTime.getHours()).toBe(9); // Default hour
      expect(startTime.getMinutes()).toBe(0); // Default minute
      
      const endTime = new Date(session.endTime);
      expect(endTime.getHours()).toBe(9);
      expect(endTime.getMinutes()).toBe(30); // Default 30 min duration
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should handle missing or invalid speakers array', () => {
      const day = new Date('2023-06-26');
      
      // Use undefined to test invalid speakers array
      const session = createSession(
        '1',
        day,
        9,
        0,
        30,
        'Main',
        'Test Session',
        undefined as unknown as Speaker[], // Invalid speakers array
        'Beginner'
      );
      
      // Should have used empty array as fallback
      expect(session.speakers).toEqual([]);
    });
    
    it('should handle missing stage and title', () => {
      const day = new Date('2023-06-26');
      
      // @ts-ignore - Deliberately passing invalid parameters for testing
      const session = createSession(
        '1',
        day,
        9,
        0,
        30,
        '', // Empty stage
        '', // Empty title
        [],
        'Beginner'
      );
      
      // Should use default values
      expect(session.stage).toBe('NA');
      expect(session.title).toBe('Untitled Session');
    });
  });

  describe('refreshSessions', () => {
    // Mock getSessionsFromGoogleSheet for all tests in this describe block
    beforeAll(() => {
      jest.mock('../src/schedule-manager', () => ({
        getSessionsFromGoogleSheet: jest.fn().mockImplementation(() => mockRawScheduleData)
      }));
    });
    
    afterAll(() => {
      jest.restoreAllMocks();
    });
    
    beforeEach(() => {
      // Reset allSessions before each test
      allSessions.length = 0;
      
      // Reset the mock implementation
      (getSessionsFromGoogleSheet as jest.Mock).mockImplementation(() => mockRawScheduleData);
    });
    
    it('should update allSessions with data from getSessionData', async () => {
      // Call refreshSessions
      const result = await refreshSessions();
      
      // Check that getSessionsFromGoogleSheet was called
      expect(getSessionsFromGoogleSheet).toHaveBeenCalled();
      
      // Check that the result matches allSessions
      expect(result).toBe(allSessions);
    });

    it('should handle missing GOOGLE_SHEET_ID environment variable', async () => {
      // Save original env var
      const originalSheetId = process.env.GOOGLE_SHEET_ID;
      
      try {
        // Temporarily remove the environment variable
        delete process.env.GOOGLE_SHEET_ID;
        
        // Call refreshSessions
        const result = await refreshSessions();
        
        // Result should be empty array
        expect(result).toEqual([]);
        
        // allSessions should be empty
        expect(allSessions).toHaveLength(0);
      } finally {
        // Restore original env var
        process.env.GOOGLE_SHEET_ID = originalSheetId;
      }
    });
    
    it('should return empty array when getSessionData fails with error', async () => {
      // Make getSessionsFromGoogleSheet throw an error
      (getSessionsFromGoogleSheet as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Fetch error');
      });
      
      // Ensure allSessions is empty
      allSessions.length = 0;
      
      // Call refreshSessions - it should return empty array from getSessionData
      const result = await refreshSessions();
      
      // Result should be empty array
      expect(result).toEqual([]);
      
      // allSessions should be empty
      expect(allSessions).toHaveLength(0);
    });
    
    it('should handle fetch errors gracefully', async () => {
      // Make sure allSessions is empty to start
      allSessions.length = 0;
      
      // Make getSessionsFromGoogleSheet throw an error
      (getSessionsFromGoogleSheet as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      // Call refreshSessions
      const result = await refreshSessions();
      
      // Result should be empty array
      expect(result).toEqual([]);
      
      // allSessions should remain empty
      expect(allSessions).toHaveLength(0);
    });
    
    it('should log appropriate messages during refresh', async () => {
      // Spy on console methods
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        // Test successful refresh
        await refreshSessions();

        // Should log about refreshing and success
        expect(consoleLogSpy).toHaveBeenCalledWith('Refreshing sessions data...');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Sessions refreshed:'));
        expect(consoleLogSpy).toHaveBeenCalledWith('Fetching session data from Google Sheets...');

        // Reset mocks
        consoleLogSpy.mockClear();
        consoleErrorSpy.mockClear();

        // Test error scenario
        (getSessionsFromGoogleSheet as jest.Mock).mockImplementationOnce(() => {
          throw new Error('Fetch error');
        });

        // Call refreshSessions again
        await refreshSessions();

        // Should log about refreshing
        expect(consoleLogSpy).toHaveBeenCalledWith('Refreshing sessions data...');

        // Should log error with the actual message format used in the code
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error getting session data:'));
      } finally {
        // Always restore console spies
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }
    });
  });
});
