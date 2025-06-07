import { createSession, refreshSessions, allSessions } from '../src/sessions';
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
  });

  describe('refreshSessions', () => {
    it('should update allSessions with data from getSessionData', async () => {
      // Call refreshSessions
      const result = await refreshSessions();
      
      // Check that getSessionsFromGoogleSheet was called
      expect(getSessionsFromGoogleSheet).toHaveBeenCalled();
      
      // Check that allSessions was updated
      expect(allSessions).toHaveLength(2);
      expect(allSessions[0].title).toBe('Doors Open');
      expect(allSessions[1].title).toBe('Opening Keynote');
      
      // Check that the result matches allSessions
      expect(result).toBe(allSessions);
    });

    it('should handle errors from getSessionData', async () => {
      // Make getSessionsFromGoogleSheet throw an error
      (getSessionsFromGoogleSheet as jest.Mock).mockRejectedValueOnce(new Error('Fetch error'));
      
      // Call refreshSessions - it should return an empty array rather than throwing
      const result = await refreshSessions();
      
      // Result should be an empty array
      expect(result).toEqual([]);
      
      // allSessions should remain unchanged
      expect(allSessions).toHaveLength(0);
    });
  });
});
