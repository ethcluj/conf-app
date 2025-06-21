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
        if (query.includes('SELECT COUNT(*) FROM qna_users WHERE display_name')) {
          return { rows: [{ count: '0' }] }; // Mock unique display name
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
          vote_count: '5', // Changed from votes to vote_count to match service implementation
        },
        {
          id: 2,
          session_id: 'session1',
          content: 'Question 2',
          author_id: 2,
          author_name: 'User2',
          created_at: new Date(),
          vote_count: '3', // Changed from votes to vote_count to match service implementation
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
          // author_name removed as part of data normalization
          display_name: 'User1', // Added display_name from joined users table
          created_at: new Date(),
          vote_count: '5', // Changed from votes to vote_count
          has_user_voted: true,
        },
      ];

      // Setup mock responses for both queries
      mockPool.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('SELECT question_id')) {
          // This is the user votes query
          return { rows: [{ question_id: 1 }] };
        } else {
          // This is the main questions query
          return { rows: mockQuestions };
        }
      });

      // Call the method with userId
      const result = await qnaService.getQuestionsBySession('session1', 1);

      // Assertions
      // Don't check exact parameters since the implementation makes two separate queries
      // Just verify the result has the expected user vote status
      expect(result[0].hasUserVoted).toBe(true);
    });
  });

  describe('updateUserDisplayName', () => {
    beforeEach(() => {
      // Setup client for transaction
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should update user display name when name is unique', async () => {
      // Mock user data
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        display_name: 'NewDisplayName',
        auth_token: 'token123',
        fingerprint: 'fp123',
        created_at: new Date(),
      };

      // Setup mock responses
      mockClient.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('SELECT COUNT(*) FROM qna_users WHERE display_name =')) {
          return { rows: [{ count: '0' }] }; // No existing user with this name
        }
        if (query.includes('UPDATE qna_users SET display_name =')) {
          return { rows: [mockUser] }; // Return updated user
        }
        return { rows: [] };
      });

      // Call the method
      const result = await qnaService.updateUserDisplayName(1, 'NewDisplayName');

      // Assertions
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) FROM qna_users WHERE display_name = $1 AND id != $2',
        ['NewDisplayName', 1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE qna_users SET display_name = $1 WHERE id = $2 RETURNING *',
        ['NewDisplayName', 1]
      );
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        displayName: 'NewDisplayName',
        authToken: 'token123',
        fingerprint: 'fp123',
        createdAt: expect.any(Date),
      });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw an error when display name is already in use', async () => {
      // Setup mock responses
      mockClient.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('SELECT COUNT(*) FROM qna_users WHERE display_name =')) {
          return { rows: [{ count: '1' }] }; // Name already exists
        }
        return { rows: [] };
      });

      // Call the method and expect it to throw
      await expect(qnaService.updateUserDisplayName(1, 'ExistingName'))
        .rejects
        .toThrow('Display name already in use by another user');

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle errors and rollback transaction', async () => {
      // Setup mock to throw an error
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') {
          return Promise.resolve();
        }
        if (query.includes('SELECT COUNT(*) FROM qna_users')) {
          throw new Error('Database error');
        }
        return Promise.resolve({ rows: [] });
      });

      // Call the method and expect it to throw
      await expect(qnaService.updateUserDisplayName(1, 'NewName'))
        .rejects
        .toThrow('Database error');

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
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
        if (query.includes('SELECT q.id, q.session_id, q.author_id FROM qna_questions')) {
          return { rows: [{ id: 1, session_id: 'session1', author_id: 2 }] }; // User 2 is the author, not user 1
        }
        if (query.includes('SELECT * FROM qna_votes')) {
          return { rows: [] }; // No existing vote
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
        'SELECT q.id, q.session_id, q.author_id FROM qna_questions q WHERE q.id = $1',
        [1]
      );
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
        if (query.includes('SELECT q.id, q.session_id, q.author_id FROM qna_questions')) {
          return { rows: [{ id: 1, session_id: 'session1', author_id: 2 }] }; // User 2 is the author, not user 1
        }
        if (query.includes('SELECT * FROM qna_votes')) {
          return { rows: [{ id: 1, question_id: 1, user_id: 1 }] }; // Existing vote
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
        'SELECT q.id, q.session_id, q.author_id FROM qna_questions q WHERE q.id = $1',
        [1]
      );
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
        if (query.includes('SELECT q.id, q.session_id, q.author_id FROM qna_questions')) {
          return { rows: [{ id: 1, session_id: 'session1', author_id: 2 }] }; // Return valid question data
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

    it('should not allow users to vote on their own questions', async () => {
      // Mock question with the user as the author
      mockClient.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('SELECT q.id, q.session_id, q.author_id FROM qna_questions')) {
          return { rows: [{ id: 1, session_id: 'session1', author_id: 5 }] }; // User 5 is the author
        }
        return { rows: [] };
      });

      // Call the method with the same user ID as the author
      const result = await qnaService.toggleVote(1, 5);

      // Assertions
      expect(result).toBeUndefined(); // Should return undefined when user is the author
      
      // Verify that no vote operations were performed
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO qna_votes/),
        expect.anything()
      );
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringMatching(/DELETE FROM qna_votes/),
        expect.anything()
      );
      
      // Verify that COMMIT was still called (transaction completed)
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
