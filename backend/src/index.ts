import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { allSessions } from './sessions';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
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

// Initialize database
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
  } finally {
    client.release();
  }
};

// Sessions endpoint
app.get('/sessions', (req, res) => {
  res.json(allSessions);
});

// Routes
app.get('/value', async (req, res) => {
  try {
    const result = await pool.query('SELECT value FROM values ORDER BY id DESC LIMIT 1');
    res.json({ value: result.rows[0]?.value || 'Default Value' });
  } catch (error) {
    console.error('Error fetching value:', error);
    res.status(500).json({ error: 'Failed to fetch value' });
  }
});

app.put('/value', async (req, res) => {
  const { value } = req.body;
  if (!value) {
    return res.status(400).json({ error: 'Value is required' });
  }

  try {
    await pool.query('INSERT INTO values (value) VALUES ($1)', [value]);
    res.json({ value });
  } catch (error) {
    console.error('Error updating value:', error);
    res.status(500).json({ error: 'Failed to update value' });
  }
});

// Initialize database and start server
initDb().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}); 