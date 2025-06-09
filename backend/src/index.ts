import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { allSessions, refreshSessions } from './sessions';
import { allSpeakers, refreshSpeakers } from './speakers';
import { initQnaSchema } from './qna-schema';
import { createQnaRoutes } from './qna-routes';
import sseRoutes from './routes/sse-routes';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const port = process.env.PORT || 3001;

// Configure middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'value_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

/**
 * Initialize database with required tables
 */
const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS values (
        id SERIAL PRIMARY KEY,
        value TEXT NOT NULL
      );
      
      INSERT INTO values (value) 
      SELECT 'Default Value'
      WHERE NOT EXISTS (SELECT 1 FROM values);
    `);
    console.log('Database initialized successfully');
    
    // Initialize QnA schema
    await initQnaSchema(pool);
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// API response standardization
const createSuccessResponse = (data: any) => ({ success: true, data });
const createErrorResponse = (message: string, details?: any) => ({ 
  success: false, 
  error: message,
  ...(details && { details })
});

// Sessions endpoints
app.get('/sessions', async (req, res) => {
  try {
    // Force refresh if requested
    if (req.query.refresh === 'true') {
      await refreshSessions();
    }
    res.json(createSuccessResponse(allSessions));
  } catch (error) {
    console.error('Error serving sessions:', error);
    res.status(500).json(createErrorResponse('Failed to fetch sessions', { message: (error as Error).message }));
  }
});

app.post('/refresh-sessions', async (req, res) => {
  try {
    const sessions = await refreshSessions();
    res.json(createSuccessResponse({ count: sessions.length }));
  } catch (error) {
    console.error('Error refreshing sessions:', error);
    res.status(500).json(createErrorResponse('Failed to refresh sessions', { message: (error as Error).message }));
  }
});

// Speakers endpoints
app.get('/speakers', async (req, res) => {
  try {
    if (req.query.refresh === 'true') {
      await refreshSpeakers();
    }
    res.json(createSuccessResponse(allSpeakers));
  } catch (error) {
    console.error('Error serving speakers:', error);
    res.status(500).json(createErrorResponse('Failed to fetch speakers', { message: (error as Error).message }));
  }
});

app.post('/refresh-speakers', async (req, res) => {
  try {
    const speakers = await refreshSpeakers();
    res.json(createSuccessResponse({ count: speakers.length }));
  } catch (error) {
    console.error('Error refreshing speakers:', error);
    res.status(500).json(createErrorResponse('Failed to refresh speakers', { message: (error as Error).message }));
  }
});

// Database routes
app.get('/value', async (req, res) => {
  try {
    const result = await pool.query('SELECT value FROM values ORDER BY id DESC LIMIT 1');
    res.json(createSuccessResponse({ value: result.rows[0]?.value || 'Default Value' }));
  } catch (error) {
    console.error('Error fetching value:', error);
    res.status(500).json(createErrorResponse('Failed to fetch value', { message: (error as Error).message }));
  }
});

app.put('/value', async (req, res) => {
  const { value } = req.body;
  if (!value) {
    return res.status(400).json(createErrorResponse('Value is required'));
  }

  try {
    await pool.query('INSERT INTO values (value) VALUES ($1)', [value]);
    res.json(createSuccessResponse({ value }));
  } catch (error) {
    console.error('Error updating value:', error);
    res.status(500).json(createErrorResponse('Failed to update value', { message: (error as Error).message }));
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json(createSuccessResponse({ status: 'ok', timestamp: new Date().toISOString() }));
});

// QnA routes
app.use('/qna', createQnaRoutes(pool));

// SSE routes for real-time updates
app.use('/sse', sseRoutes);

/**
 * Initialize and start the server
 */
const startServer = async () => {
  // Initial data load
  try {
    await refreshSessions();
    console.log(`Loaded ${allSessions.length} sessions`);
  } catch (error) {
    console.error('Failed to load initial session data:', error);
  }

  try {
    await refreshSpeakers();
    console.log(`Loaded ${allSpeakers.length} speakers`);
  } catch (error) {
    console.error('Failed to load initial speakers data:', error);
  }

  // Set up periodic refresh
  const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL || '300000'); // 5 minutes in milliseconds
  
  setInterval(async () => {
    try {
      await refreshSessions();
      console.log(`Sessions refreshed: ${allSessions.length} total`);
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    }
  }, REFRESH_INTERVAL);

  setInterval(async () => {
    try {
      await refreshSpeakers();
      console.log(`Speakers refreshed: ${allSpeakers.length} total`);
    } catch (error) {
      console.error('Failed to refresh speakers:', error);
    }
  }, REFRESH_INTERVAL);

  // Start the server
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Data refresh interval: ${REFRESH_INTERVAL}ms`);
  });
};

// Try to initialize database, but if it fails, still start the server
initDb().then(startServer).catch(error => {
  console.error('Failed to initialize database:', error);
  console.log('Starting server without database...');
  startServer();
});
