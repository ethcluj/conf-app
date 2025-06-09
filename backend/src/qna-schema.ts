import { Pool } from 'pg';

/**
 * Initialize QnA database schema
 * Creates tables for users, questions, and votes if they don't exist
 */
export const initQnaSchema = async (pool: Pool): Promise<void> => {
  const client = await pool.connect();
  try {
    // Begin transaction
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qna_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        auth_token VARCHAR(255),
        fingerprint VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create questions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qna_questions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER REFERENCES qna_users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create votes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qna_votes (
        id SERIAL PRIMARY KEY,
        question_id INTEGER REFERENCES qna_questions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES qna_users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(question_id, user_id)
      );
    `);

    // Commit transaction
    await client.query('COMMIT');
    
    console.log('QnA database schema initialized successfully');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error initializing QnA database schema:', error);
    throw error;
  } finally {
    client.release();
  }
};
