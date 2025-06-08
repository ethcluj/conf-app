import { initQnaSchema } from '../qna-schema';
import { Pool } from 'pg';

// Mock the pg Pool
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('QnA Schema', () => {
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
  });

  describe('initQnaSchema', () => {
    it('should create all required tables if they do not exist', async () => {
      // Setup mock responses
      mockClient.query.mockResolvedValue({});
      
      // Call the function
      await initQnaSchema(mockPool);
      
      // Assertions
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      
      // Check that all tables are created
      const createTableCalls = mockClient.query.mock.calls.filter(
        (call: any[]) => call[0].includes('CREATE TABLE IF NOT EXISTS')
      );
      
      // Should create 3 tables: users, questions, and votes
      expect(createTableCalls.length).toBe(3);
      
      // Check for specific table creation
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS qna_users')
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS qna_questions')
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS qna_votes')
      );
      
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle errors and rollback transaction', async () => {
      // Setup mock to throw an error
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') {
          return Promise.resolve();
        }
        if (query.includes('CREATE TABLE')) {
          throw new Error('Database error');
        }
        return Promise.resolve();
      });
      
      // Call the function and expect it to throw
      await expect(initQnaSchema(mockPool))
        .rejects
        .toThrow('Database error');
      
      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
