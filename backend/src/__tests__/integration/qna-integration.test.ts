import { Pool } from 'pg';
import { initQnaSchema } from '../../qna-schema';
import { QnaService } from '../../qna-service';

// Helper to check if database is available
async function isDatabaseAvailable(config: any): Promise<boolean> {
  const testPool = new Pool(config);
  try {
    await testPool.query('SELECT 1');
    await testPool.end();
    return true;
  } catch (error: any) {
    console.log('Database not available for integration tests:', error.message);
    await testPool.end().catch(() => {});
    return false;
  }
}

// This is an integration test that requires a real database connection
// It should be run with a test database, not the production database
// These tests will be skipped if database is not available
describe('QnA Integration Tests', () => {
  // Database configuration
  const dbConfig = {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    // Short connection timeout to fail fast if DB is not available
    connectionTimeoutMillis: 2000
  };
  
  // Check if we should run these tests
  let dbAvailable = false;
  
  beforeAll(async () => {
    // Check if database is available
    dbAvailable = await isDatabaseAvailable(dbConfig);
    if (!dbAvailable) {
      console.log('Skipping integration tests as database is not available');
    }
  });
  let pool: Pool;
  let qnaService: QnaService;
  
  // Use a unique schema name for isolation
  const testSchema = `qna_test_${Date.now()}`;
  
  // Setup for tests that require database
  beforeAll(async () => {
    // Skip setup if database is not available
    if (!dbAvailable) return;
    
    // Create a connection pool to the test database
    pool = new Pool(dbConfig);
    
    try {
      // Create a test schema for isolation
      await pool.query(`CREATE SCHEMA IF NOT EXISTS ${testSchema}`);
      await pool.query(`SET search_path TO ${testSchema}`);
      
      // Initialize the schema
      await initQnaSchema(pool);
      
      // Create service instance
      qnaService = new QnaService(pool);
    } catch (error: any) {
      console.error('Error setting up integration tests:', error);
      dbAvailable = false;
    }
  });
  
  afterAll(async () => {
    // Skip cleanup if database is not available
    if (!dbAvailable || !pool) return;
    
    try {
      // Clean up - drop the test schema
      await pool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
      await pool.end();
    } catch (error: any) {
      console.error('Error cleaning up integration tests:', error);
    }
  });
  
  describe('User Management', () => {
    it('should create a new user', async () => {
      // Skip test if database is not available
      if (!dbAvailable) {
        console.log('Skipping test as database is not available');
        return;
      }
      // Create a user with email
      const user = await qnaService.getOrCreateUser('test@example.com');
      
      // Assertions
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.displayName).toBeDefined();
      expect(user.authToken).toBeDefined();
    });
    
    it('should retrieve an existing user by email', async () => {
      // Skip test if database is not available
      if (!dbAvailable) {
        console.log('Skipping test as database is not available');
        return;
      }
      // Create a user first
      const user1 = await qnaService.getOrCreateUser('existing@example.com');
      
      // Retrieve the same user
      const user2 = await qnaService.getOrCreateUser('existing@example.com');
      
      // Assertions
      expect(user2.id).toBe(user1.id);
      expect(user2.email).toBe(user1.email);
      expect(user2.displayName).toBe(user1.displayName);
    });
    
    it('should create a user with fingerprint', async () => {
      // Skip test if database is not available
      if (!dbAvailable) {
        console.log('Skipping test as database is not available');
        return;
      }
      // Create a user with fingerprint
      const user = await qnaService.getOrCreateUser(undefined, 'test-fingerprint');
      
      // Assertions
      expect(user).toBeDefined();
      expect(user.email).toBeNull();
      expect(user.fingerprint).toBe('test-fingerprint');
      expect(user.displayName).toBeDefined();
    });
    
    it('should update user display name', async () => {
      // Skip test if database is not available
      if (!dbAvailable) {
        console.log('Skipping test as database is not available');
        return;
      }
      // Create a user first
      const user = await qnaService.getOrCreateUser('update@example.com');
      
      // Update display name
      const updatedUser = await qnaService.updateUserDisplayName(user.id, 'New Name');
      
      // Assertions
      expect(updatedUser.id).toBe(user.id);
      expect(updatedUser.displayName).toBe('New Name');
    });
  });
  
  describe('Question Management', () => {
    // Skip all tests in this describe block if database is not available
    beforeAll(() => {
      if (!dbAvailable) {
        console.log('Skipping Question Management tests as database is not available');
      }
    });
    let testUser: any;
    let sessionId: string;
    
    beforeAll(async () => {
      // Skip if database is not available
      if (!dbAvailable) return;
      
      // Create a test user
      testUser = await qnaService.getOrCreateUser('questions@example.com');
      sessionId = 'test-session';
    });
    
    it('should add a question', async () => {
      // Skip test if database is not available
      if (!dbAvailable) {
        console.log('Skipping test as database is not available');
        return;
      }
      // Add a question
      const question = await qnaService.addQuestion(
        sessionId,
        'Test question content',
        testUser.id
      );
      
      // Assertions
      expect(question).toBeDefined();
      expect(question.sessionId).toBe(sessionId);
      expect(question.content).toBe('Test question content');
      expect(question.authorId).toBe(testUser.id);
      // authorName assertion removed as part of data normalization
      expect(question.votes).toBe(0);
    });
    
    it('should get questions by session', async () => {
      // Skip test if database is not available
      if (!dbAvailable) {
        console.log('Skipping test as database is not available');
        return;
      }
      // Add another question to the same session
      await qnaService.addQuestion(
        sessionId,
        'Another test question',
        testUser.id
      );
      
      // Get questions for the session
      const questions = await qnaService.getQuestionsBySession(sessionId);
      
      // Assertions
      expect(questions.length).toBeGreaterThanOrEqual(2);
      expect(questions[0].sessionId).toBe(sessionId);
      
      // Check if questions are sorted by votes
      const sortedByVotes = [...questions].sort((a, b) => b.votes - a.votes);
      expect(questions).toEqual(sortedByVotes);
    });
    
    it('should toggle votes on a question', async () => {
      // Skip test if database is not available
      if (!dbAvailable) {
        console.log('Skipping test as database is not available');
        return;
      }
      // Add a question
      const question = await qnaService.addQuestion(
        sessionId,
        'Question for voting',
        testUser.id
      );
      
      // Create another user for voting
      const voter = await qnaService.getOrCreateUser('voter@example.com');
      
      // Add a vote
      const voteAdded = await qnaService.toggleVote(question.id, voter.id);
      expect(voteAdded).toBe(true);
      
      // Get the question to check votes
      const questions = await qnaService.getQuestionsBySession(sessionId, voter.id);
      const updatedQuestion = questions.find(q => q.id === question.id);
      
      // Assertions
      expect(updatedQuestion).toBeDefined();
      expect(updatedQuestion!.votes).toBe(1);
      expect(updatedQuestion!.hasUserVoted).toBe(true);
      
      // Remove the vote
      const voteRemoved = await qnaService.toggleVote(question.id, voter.id);
      expect(voteRemoved).toBe(false);
      
      // Check votes again
      const questionsAfterRemove = await qnaService.getQuestionsBySession(sessionId, voter.id);
      const questionAfterRemove = questionsAfterRemove.find(q => q.id === question.id);
      
      // Assertions
      expect(questionAfterRemove!.votes).toBe(0);
      expect(questionAfterRemove!.hasUserVoted).toBe(false);
    });
    
    it('should delete a question', async () => {
      // Skip test if database is not available
      if (!dbAvailable) {
        console.log('Skipping test as database is not available');
        return;
      }
      // Add a question
      const question = await qnaService.addQuestion(
        sessionId,
        'Question to delete',
        testUser.id
      );
      
      // Delete the question
      const deleted = await qnaService.deleteQuestion(question.id, testUser.id);
      expect(deleted).toBe(true);
      
      // Try to get the deleted question
      const questions = await qnaService.getQuestionsBySession(sessionId);
      const deletedQuestion = questions.find(q => q.id === question.id);
      
      // Assertions
      expect(deletedQuestion).toBeUndefined();
    });
    
    it('should not allow deletion by non-author', async () => {
      // Skip test if database is not available
      if (!dbAvailable) {
        console.log('Skipping test as database is not available');
        return;
      }
      // Add a question
      const question = await qnaService.addQuestion(
        sessionId,
        'Question with restricted deletion',
        testUser.id
      );
      
      // Create another user
      const otherUser = await qnaService.getOrCreateUser('other@example.com');
      
      // Try to delete the question as non-author
      const deleted = await qnaService.deleteQuestion(question.id, otherUser.id);
      expect(deleted).toBe(false);
      
      // Check that the question still exists
      const questions = await qnaService.getQuestionsBySession(sessionId);
      const stillExists = questions.some(q => q.id === question.id);
      
      // Assertions
      expect(stillExists).toBe(true);
    });
  });
  
  describe('Leaderboard', () => {
    it('should generate a leaderboard with correct scoring', async () => {
      // Skip test if database is not available
      if (!dbAvailable) {
        console.log('Skipping test as database is not available');
        return;
      }
      // Create users
      const user1 = await qnaService.getOrCreateUser('leader1@example.com');
      const user2 = await qnaService.getOrCreateUser('leader2@example.com');
      const voter = await qnaService.getOrCreateUser('voter@example.com');
      
      const sessionId = 'leaderboard-session';
      
      // User 1 asks 2 questions
      const q1 = await qnaService.addQuestion(sessionId, 'Question 1', user1.id);
      const q2 = await qnaService.addQuestion(sessionId, 'Question 2', user1.id);
      
      // User 2 asks 1 question
      const q3 = await qnaService.addQuestion(sessionId, 'Question 3', user2.id);
      
      // Voter votes for questions
      await qnaService.toggleVote(q1.id, voter.id); // Vote for user1's question
      await qnaService.toggleVote(q3.id, voter.id); // Vote for user2's question
      
      // Get leaderboard
      const leaderboard = await qnaService.getLeaderboard();
      
      // Assertions
      expect(leaderboard.length).toBeGreaterThanOrEqual(2);
      
      // Find our test users in the leaderboard
      const leader1 = leaderboard.find(l => l.userId === user1.id);
      const leader2 = leaderboard.find(l => l.userId === user2.id);
      
      // Check user1 score: 3 points for question with votes + 5 bonus points for top question in session = 8 points
      expect(leader1).toBeDefined();
      expect(leader1!.questionsAsked).toBe(2);
      expect(leader1!.upvotesReceived).toBe(1);
      expect(leader1!.score).toBe(8); // 3 + 5 bonus points for top question
      
      // Check user2 score: 3 points for question with votes + 0 bonus points = 3 points
      expect(leader2).toBeDefined();
      expect(leader2!.questionsAsked).toBe(1);
      expect(leader2!.upvotesReceived).toBe(1);
      expect(leader2!.score).toBe(3); // 3 points for a question with votes
      
      // Check that the leaderboard is sorted by score
      expect(leaderboard[0].score).toBeGreaterThanOrEqual(leaderboard[1].score);
    });
  });
});
