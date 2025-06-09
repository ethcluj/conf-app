import request from 'supertest';
import express from 'express';
import { createQnaRoutes } from '../qna-routes';
import { QnaService } from '../qna-service';

// Mock QnaService
jest.mock('../qna-service');

describe('QnA Routes', () => {
  let app: express.Application;
  let mockQnaService: jest.Mocked<QnaService>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock QnaService
    mockQnaService = {
      getOrCreateUser: jest.fn(),
      updateUserDisplayName: jest.fn(),
      getQuestionsBySession: jest.fn(),
      addQuestion: jest.fn(),
      toggleVote: jest.fn(),
      deleteQuestion: jest.fn(),
      getLeaderboard: jest.fn(),
    } as unknown as jest.Mocked<QnaService>;
    
    // Mock the QnaService constructor
    (QnaService as jest.Mock).mockImplementation(() => mockQnaService);
    
    // Create Express app with QnA routes
    app = express();
    app.use(express.json());
    app.use('/qna', createQnaRoutes({} as any)); // Pool is mocked in QnaService
  });

  describe('GET /qna/questions/:sessionId', () => {
    it('should return questions for a session', async () => {
      // Mock data
      const mockQuestions = [
        {
          id: 1,
          sessionId: 'session1',
          content: 'Test question',
          authorId: 1,
          authorName: 'User1',
          votes: 5,
          createdAt: new Date(),
        },
      ];
      
      // Setup mock implementation
      mockQnaService.getQuestionsBySession.mockResolvedValue(mockQuestions);
      
      // Make request
      const response = await request(app)
        .get('/qna/questions/session1')
        .expect(200);
      
      // Assertions
      expect(response.body.success).toBe(true);
      // Use expect.objectContaining to avoid date serialization issues
      expect(response.body.data).toEqual([
        expect.objectContaining({
          id: 1,
          sessionId: 'session1',
          content: 'Test question',
          authorId: 1,
          authorName: 'User1',
          votes: 5
        })
      ]);
      expect(mockQnaService.getQuestionsBySession).toHaveBeenCalledWith('session1', undefined);
    });
    
    it('should handle errors', async () => {
      // Setup mock to throw error
      mockQnaService.getQuestionsBySession.mockRejectedValue(new Error('Test error'));
      
      // Make request
      const response = await request(app)
        .get('/qna/questions/session1')
        .expect(500);
      
      // Assertions
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get questions');
    });
  });

  describe('POST /qna/questions', () => {
    it('should add a new question when authenticated', async () => {
      // Mock data
      const mockUser = { id: 1, displayName: 'User1' };
      const mockQuestion = {
        id: 1,
        sessionId: 'session1',
        content: 'New question',
        authorId: 1,
        authorName: 'User1',
        votes: 0,
        createdAt: new Date(),
      };
      
      // Setup mock implementations
      mockQnaService.getOrCreateUser.mockResolvedValue(mockUser as any);
      mockQnaService.addQuestion.mockResolvedValue(mockQuestion as any);
      
      // Make request
      const response = await request(app)
        .post('/qna/questions')
        .set('X-Fingerprint', 'test-fingerprint')
        .send({ sessionId: 'session1', content: 'New question' })
        .expect(201);
      
      // Assertions
      expect(response.body.success).toBe(true);
      // Use expect.objectContaining to avoid date serialization issues
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: 1,
          sessionId: 'session1',
          content: 'New question',
          authorId: 1,
          authorName: 'User1',
          votes: 0
        })
      );
      expect(mockQnaService.getOrCreateUser).toHaveBeenCalled();
      expect(mockQnaService.addQuestion).toHaveBeenCalledWith('session1', 'New question', 1);
    });
    
    it('should return 400 when missing required fields', async () => {
      // Setup mock implementation
      mockQnaService.getOrCreateUser.mockResolvedValue({ id: 1 } as any);
      
      // Make request with missing content
      const response = await request(app)
        .post('/qna/questions')
        .set('X-Fingerprint', 'test-fingerprint')
        .send({ sessionId: 'session1' })
        .expect(400);
      
      // Assertions
      expect(response.body.success).toBe(false);
      expect(mockQnaService.addQuestion).not.toHaveBeenCalled();
    });
    
    it('should return 401 when not authenticated', async () => {
      // Make request without authentication
      const response = await request(app)
        .post('/qna/questions')
        .send({ sessionId: 'session1', content: 'New question' })
        .expect(401);
      
      // Assertions
      expect(response.body.success).toBe(false);
      expect(mockQnaService.addQuestion).not.toHaveBeenCalled();
    });
  });

  describe('POST /qna/questions/:id/vote', () => {
    it('should toggle vote when authenticated', async () => {
      // Mock data
      const mockUser = { id: 1, displayName: 'User1' };
      
      // Setup mock implementations
      mockQnaService.getOrCreateUser.mockResolvedValue(mockUser as any);
      mockQnaService.toggleVote.mockResolvedValue(true);
      
      // Make request
      const response = await request(app)
        .post('/qna/questions/1/vote')
        .set('X-Fingerprint', 'test-fingerprint')
        .expect(200);
      
      // Assertions
      expect(response.body.success).toBe(true);
      expect(response.body.data.voteAdded).toBe(true);
      expect(mockQnaService.toggleVote).toHaveBeenCalledWith(1, 1);
    });
    
    it('should return 401 when not authenticated', async () => {
      // Make request without authentication
      const response = await request(app)
        .post('/qna/questions/1/vote')
        .expect(401);
      
      // Assertions
      expect(response.body.success).toBe(false);
      expect(mockQnaService.toggleVote).not.toHaveBeenCalled();
    });
  });

  describe('GET /qna/leaderboard', () => {
    it('should return leaderboard data', async () => {
      // Mock data
      const mockLeaderboard = [
        {
          userId: 1,
          displayName: 'User1',
          score: 10,
          questionsAsked: 3,
          upvotesReceived: 1,
        },
        {
          userId: 2,
          displayName: 'User2',
          score: 5,
          questionsAsked: 1,
          upvotesReceived: 2,
        },
      ];
      
      // Setup mock implementation
      mockQnaService.getLeaderboard.mockResolvedValue(mockLeaderboard as any);
      
      // Make request
      const response = await request(app)
        .get('/qna/leaderboard')
        .expect(200);
      
      // Assertions
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockLeaderboard);
      expect(mockQnaService.getLeaderboard).toHaveBeenCalled();
    });
    
    it('should handle errors', async () => {
      // Setup mock to throw error
      mockQnaService.getLeaderboard.mockRejectedValue(new Error('Test error'));
      
      // Make request
      const response = await request(app)
        .get('/qna/leaderboard')
        .expect(500);
      
      // Assertions
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get leaderboard');
    });
  });
});
