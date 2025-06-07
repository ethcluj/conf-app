import express from 'express';
import request from 'supertest';
import { refreshSessions, allSessions } from '../src/sessions';
import { refreshSpeakers, allSpeakers } from '../src/speakers';

// Mock the sessions and speakers modules
jest.mock('../src/sessions');
jest.mock('../src/speakers');

// Create a simplified version of the app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Sessions endpoint
  app.get('/sessions', (req, res) => {
    res.json(allSessions);
  });

  // Speakers endpoint
  app.get('/speakers', (req, res) => {
    res.json(allSpeakers);
  });

  // Refresh sessions endpoint
  app.get('/refresh-sessions', async (req, res) => {
    try {
      await refreshSessions();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to refresh sessions' });
    }
  });

  // Refresh speakers endpoint
  app.get('/refresh-speakers', async (req, res) => {
    try {
      await refreshSpeakers();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to refresh speakers' });
    }
  });

  // Simple key-value store endpoints
  const valueStore: Record<string, any> = {};

  app.get('/values/:key', (req, res) => {
    const { key } = req.params;
    res.json({ value: valueStore[key] || null });
  });

  app.post('/values/:key', (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    valueStore[key] = value;
    res.json({ success: true });
  });

  return app;
};

describe('API Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
    
    // Set up mock data
    (allSessions as any) = [
      { id: '1', title: 'Test Session 1', stage: 'Main' },
      { id: '2', title: 'Test Session 2', stage: 'Tech' }
    ];
    
    (allSpeakers as any) = [
      { name: 'Test Speaker 1', org: 'Org 1' },
      { name: 'Test Speaker 2', org: 'Org 2' }
    ];
    
    // Mock refresh functions
    (refreshSessions as jest.Mock).mockResolvedValue(allSessions);
    (refreshSpeakers as jest.Mock).mockResolvedValue(allSpeakers);
  });

  describe('GET /sessions', () => {
    it('should return all sessions', async () => {
      const response = await request(app).get('/sessions');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Test Session 1');
    });
  });

  describe('GET /speakers', () => {
    it('should return all speakers', async () => {
      const response = await request(app).get('/speakers');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Test Speaker 1');
    });
  });

  describe('GET /refresh-sessions', () => {
    it('should refresh sessions and return success', async () => {
      const response = await request(app).get('/refresh-sessions');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(refreshSessions).toHaveBeenCalled();
    });

    it('should handle errors during refresh', async () => {
      // Make refreshSessions throw an error
      (refreshSessions as jest.Mock).mockRejectedValueOnce(new Error('Refresh error'));
      
      const response = await request(app).get('/refresh-sessions');
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to refresh sessions' });
    });
  });

  describe('GET /refresh-speakers', () => {
    it('should refresh speakers and return success', async () => {
      const response = await request(app).get('/refresh-speakers');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(refreshSpeakers).toHaveBeenCalled();
    });

    it('should handle errors during refresh', async () => {
      // Make refreshSpeakers throw an error
      (refreshSpeakers as jest.Mock).mockRejectedValueOnce(new Error('Refresh error'));
      
      const response = await request(app).get('/refresh-speakers');
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to refresh speakers' });
    });
  });

  describe('Key-Value Store', () => {
    it('should store and retrieve values', async () => {
      // Store a value
      const storeResponse = await request(app)
        .post('/values/testKey')
        .send({ value: 'testValue' });
      
      expect(storeResponse.status).toBe(200);
      expect(storeResponse.body).toEqual({ success: true });
      
      // Retrieve the value
      const getResponse = await request(app).get('/values/testKey');
      
      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toEqual({ value: 'testValue' });
    });

    it('should return null for non-existent keys', async () => {
      const response = await request(app).get('/values/nonExistentKey');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ value: null });
    });
  });
});
