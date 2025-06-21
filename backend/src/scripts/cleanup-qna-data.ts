import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../logger';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'postgres',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres'
};

/**
 * Cleanup script to delete all QnA related database entries
 * This will delete all questions, votes, and users from the QnA tables
 */
async function cleanupQnaData(options: { 
  deleteQuestions?: boolean, 
  deleteVotes?: boolean, 
  deleteUsers?: boolean,
  sessionId?: string
} = {}) {
  // Default to deleting everything if no specific options are provided
  const opts = {
    deleteQuestions: options.deleteQuestions ?? true,
    deleteVotes: options.deleteVotes ?? true,
    deleteUsers: options.deleteUsers ?? true,
    sessionId: options.sessionId
  };

  const pool = new Pool(dbConfig);
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    let deletedQuestions = 0;
    let deletedVotes = 0;
    let deletedUsers = 0;
    
    // Delete votes first (due to foreign key constraints)
    if (opts.deleteVotes) {
      if (opts.sessionId) {
        // Only delete votes for questions in the specified session
        const voteResult = await client.query(`
          DELETE FROM qna_votes
          WHERE question_id IN (
            SELECT id FROM qna_questions WHERE session_id = $1
          )
          RETURNING id
        `, [opts.sessionId]);
        deletedVotes = voteResult.rowCount ?? 0;
      } else {
        // Delete all votes
        const voteResult = await client.query('DELETE FROM qna_votes RETURNING id');
        deletedVotes = voteResult.rowCount ?? 0;
      }
      logger.info(`Deleted ${deletedVotes} votes`);
    }
    
    // Delete questions
    if (opts.deleteQuestions) {
      if (opts.sessionId) {
        // Only delete questions for the specified session
        const questionResult = await client.query(
          'DELETE FROM qna_questions WHERE session_id = $1 RETURNING id',
          [opts.sessionId]
        );
        deletedQuestions = questionResult.rowCount ?? 0;
      } else {
        // Delete all questions
        const questionResult = await client.query('DELETE FROM qna_questions RETURNING id');
        deletedQuestions = questionResult.rowCount ?? 0;
      }
      logger.info(`Deleted ${deletedQuestions} questions`);
    }
    
    // Delete users (only if not filtering by session)
    if (opts.deleteUsers && !opts.sessionId) {
      const userResult = await client.query('DELETE FROM qna_users RETURNING id');
      deletedUsers = userResult.rowCount ?? 0;
      logger.info(`Deleted ${deletedUsers} users`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    logger.info('QnA data cleanup completed successfully');
    
    return {
      deletedQuestions,
      deletedVotes,
      deletedUsers
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error during QnA data cleanup:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Interactive confirmation if run directly
if (require.main === module) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n⚠️  WARNING: This will delete QnA data from the database ⚠️\n');
  
  rl.question('Do you want to delete all QnA data? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() === 'yes') {
      try {
        const options: {
          deleteQuestions?: boolean,
          deleteVotes?: boolean,
          deleteUsers?: boolean,
          sessionId?: string
        } = {};
        
        await new Promise<void>((resolve) => {
          rl.question('Delete questions? (yes/no): ', (answer) => {
            options.deleteQuestions = answer.toLowerCase() === 'yes';
            resolve();
          });
        });
        
        await new Promise<void>((resolve) => {
          rl.question('Delete votes? (yes/no): ', (answer) => {
            options.deleteVotes = answer.toLowerCase() === 'yes';
            resolve();
          });
        });
        
        await new Promise<void>((resolve) => {
          rl.question('Delete users? (yes/no): ', (answer) => {
            options.deleteUsers = answer.toLowerCase() === 'yes';
            resolve();
          });
        });
        
        await new Promise<void>((resolve) => {
          rl.question('Filter by session ID? (leave empty for all sessions): ', (answer) => {
            options.sessionId = answer.trim() || undefined;
            resolve();
          });
        });
        
        console.log('\nStarting cleanup with options:', options);
        
        const result = await cleanupQnaData(options);
        console.log('\nCleanup completed successfully!');
        console.log(`Deleted ${result.deletedQuestions} questions, ${result.deletedVotes} votes, and ${result.deletedUsers} users.`);
      } catch (error) {
        console.error('Cleanup failed:', error);
      } finally {
        rl.close();
        process.exit(0);
      }
    } else {
      console.log('Operation cancelled.');
      rl.close();
      process.exit(0);
    }
  });
}

export { cleanupQnaData };
