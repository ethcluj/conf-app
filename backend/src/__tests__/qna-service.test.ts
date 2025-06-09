import { QnaService } from '../qna-service';
import { Pool } from 'pg';

// Mock the pg Pool
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    release: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('QnaService', () => {
  let qnaService: QnaService;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    
    // Setup mock pool
    mockPool = new Pool();
    mockPool.connect.mockResolvedValue(mockClient);
    
    // Create service instance
    qnaService = new QnaService(mockPool);
  });

  describe('getOrCreateUser', () => {
    it('should return existing user when found by email', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        display_name: 'TestUser',
        auth_token: 'token123',
        fingerprint: 'fp123',
        created_at: new Date(),
      };

      // Setup mock responses
      mockClient.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('SELECT * FROM qna_users WHERE email')) {
          return { rows: [mockUser] };
        }
        return { rows: [] };
      });

      // Call the method
      const result = await qnaService.getOrCreateUser('test@example.com');

      // Assertions
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM qna_users WHERE email = $1',
        ['test@example.com']
      );
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        displayName: 'TestUser',
        authToken: 'token123',
        fingerprint: 'fp123',
        createdAt: expect.any(Date),
      });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should create a new user when not found', async () => {
      // Mock user data for creation
      const mockCreatedUser = {
        id: 1,
        email: 'new@example.com',
        display_name: 'NewUser',
        auth_token: 'newtoken123',
        fingerprint: null,
        created_at: new Date(),
      };

      // Setup mock responses
      mockClient.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('SELECT * FROM qna_users WHERE email')) {
          return { rows: [] }; // No existing user
        }
        if (query.includes('INSERT INTO qna_users')) {
          return { rows: [mockCreatedUser] };
        }
        return { rows: [] };
      });

      // Call the method
      const result = await qnaService.getOrCreateUser('new@example.com');

      // Assertions
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM qna_users WHERE email = $1',
        ['new@example.com']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO qna_users'),
        expect.arrayContaining(['new@example.com'])
      );
      expect(result).toEqual({
        id: 1,
        email: 'new@example.com',
        displayName: 'NewUser',
        authToken: 'newtoken123',
        fingerprint: null,
        createdAt: expect.any(Date),
      });
    });

    it('should handle errors and rollback transaction', async () => {
      // Setup mock to throw an error
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') {
          return Promise.resolve();
        }
        if (query.includes('SELECT * FROM qna_users')) {
          throw new Error('Database error');
        }
        return Promise.resolve({ rows: [] });
      });

      // Call the method and expect it to throw
      await expect(qnaService.getOrCreateUser('test@example.com'))
        .rejects
        .toThrow('Database error');

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getQuestionsBySession', () => {
    it('should return questions for a session', async () => {
      // Mock questions data
      const mockQuestions = [
        {
          id: 1,
          session_id: 'session1',
          content: 'Question 1',
          author_id: 1,
          author_name: 'User1',
          created_at: new Date(),
          votes: '5',
        },
        {
          id: 2,
          session_id: 'session1',
          content: 'Question 2',
          author_id: 2,
          author_name: 'User2',
          created_at: new Date(),
          votes: '3',
        },
      ];

      // Setup mock response
      mockPool.query.mockResolvedValue({ rows: mockQuestions });

      // Call the method
      const result = await qnaService.getQuestionsBySession('session1');

      // Assertions
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['session1']
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        sessionId: 'session1',
        content: 'Question 1',
        authorId: 1,
        authorName: 'User1',
        votes: 5,
        hasUserVoted: false,
        createdAt: expect.any(Date),
      });
    });

    it('should include user vote status when userId is provided', async () => {
      // Mock questions data with user vote status
      const mockQuestions = [
        {
          id: 1,
          session_id: 'session1',
          content: 'Question 1',
          author_id: 1,
          author_name: 'User1',
          created_at: new Date(),
          votes: '5',
          has_user_voted: true,
        },
      ];

      // Setup mock response
      mockPool.query.mockResolvedValue({ rows: mockQuestions });

      // Call the method with userId
      const result = await qnaService.getQuestionsBySession('session1', 1);

      // Assertions
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['session1', 1]
      );
      expect(result[0].hasUserVoted).toBe(true);
    });
  });

  describe('toggleVote', () => {
    beforeEach(() => {
      // Setup client for transaction
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should add a vote when it does not exist', async () => {
      // Mock no existing vote
      mockClient.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('SELECT * FROM qna_votes')) {
          return { rows: [] }; // No existing vote
        }
        if (query.includes('SELECT session_id FROM qna_questions')) {
          return { rows: [{ session_id: 'session1' }] }; // Mock question exists
        }
        if (query.includes('SELECT COUNT(*) as vote_count')) {
          return { rows: [{ vote_count: '1' }] }; // Mock vote count
        }
        return { rows: [] };
      });

      // Call the method
      const result = await qnaService.toggleVote(1, 1);

      // Assertions
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM qna_votes WHERE question_id = $1 AND user_id = $2',
        [1, 1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO qna_votes (question_id, user_id) VALUES ($1, $2)',
        [1, 1]
      );
      expect(result).toBe(true); // Vote was added
    });

    it('should remove a vote when it exists', async () => {
      // Mock existing vote
      mockClient.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('SELECT * FROM qna_votes')) {
          return { rows: [{ id: 1, question_id: 1, user_id: 1 }] }; // Existing vote
        }
        if (query.includes('SELECT session_id FROM qna_questions')) {
          return { rows: [{ session_id: 'session1' }] }; // Mock question exists
        }
        if (query.includes('SELECT COUNT(*) as vote_count')) {
          return { rows: [{ vote_count: '0' }] }; // Mock vote count after removal
        }
        return { rows: [] };
      });

      // Call the method
      const result = await qnaService.toggleVote(1, 1);

      // Assertions
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM qna_votes WHERE question_id = $1 AND user_id = $2',
        [1, 1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM qna_votes WHERE question_id = $1 AND user_id = $2',
        [1, 1]
      );
      expect(result).toBe(false); // Vote was removed
    });

    it('should handle errors and rollback transaction', async () => {
      // Setup mock to throw an error
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') {
          return Promise.resolve();
        }
        if (query.includes('SELECT * FROM qna_votes')) {
          throw new Error('Database error');
        }
        return Promise.resolve({ rows: [] });
      });

      // Call the method and expect it to throw
      await expect(qnaService.toggleVote(1, 1))
        .rejects
        .toThrow('Database error');

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
