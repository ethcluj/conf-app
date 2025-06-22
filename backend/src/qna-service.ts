import { Pool } from 'pg';
import { QnaUser, QnaQuestion, LeaderboardEntry, generateRandomEthName } from './qna-types';
import crypto from 'crypto';
import { sseController } from './sse-controller';
import { logger } from './logger';

// Using the centralized logger

/**
 * QnA Service - Handles all QnA database operations
 */
export class QnaService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get a user by fingerprint only (no creation)
   */
  async getUserByFingerprint(fingerprint: string): Promise<QnaUser> {
    logger.debug('Looking up user by fingerprint', { fingerprint: fingerprint.substring(0, 8) + '...' });
    
    try {
      const result = await this.pool.query(
        'SELECT * FROM qna_users WHERE fingerprint = $1',
        [fingerprint]
      );
      
      if (result.rows.length === 0) {
        logger.info('No user found with fingerprint', { fingerprint: fingerprint.substring(0, 8) + '...' });
        throw new Error('User not found');
      }
      
      logger.info('User found by fingerprint', { 
        userId: result.rows[0].id,
        hasEmail: !!result.rows[0].email
      });
      
      return this.mapDbUserToQnaUser(result.rows[0]);
    } catch (error) {
      logger.error('Error looking up user by fingerprint', error);
      throw error;
    }
  }
  
  /**
   * Get a user by auth token
   */
  async getUserByAuthToken(authToken: string): Promise<QnaUser> {
    // Performance diagnostics - track DB query frequency
    const startTime = Date.now();
    const shortToken = authToken.substring(0, 6) + '...'; // Show only beginning for safety
    const callId = Math.random().toString(36).substring(2, 10);
    
    console.log(`[DB-AUTH-${callId}] Looking up user by auth token (${shortToken}) at ${new Date().toISOString()}`);
    // Get stack trace to identify caller
    const stackTrace = new Error().stack;
    console.log(`[DB-AUTH-${callId}] Called from:`, stackTrace);
    
    try {
      const result = await this.pool.query(
        'SELECT * FROM qna_users WHERE auth_token = $1',
        [authToken]
      );
      
      if (result.rows.length === 0) {
        logger.info('No user found with auth token');
        throw new Error('User not found by auth token');
      }
      
      logger.info('User found by auth token', { 
        userId: result.rows[0].id,
        displayName: result.rows[0].display_name
      });
      
      return this.mapDbUserToQnaUser(result.rows[0]);
    } catch (error) {
      logger.error('Error looking up user by auth token', error);
      throw error;
    }
  }

  /**
   * Get or create a user based on email or fingerprint
   */
  async getOrCreateUser(email?: string, fingerprint?: string): Promise<QnaUser> {
    logger.info('Getting or creating user', { 
      hasEmail: !!email, 
      hasFingerprint: !!fingerprint,
      emailDomain: email ? email.split('@')[1] : undefined
    });
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      let user: QnaUser | null = null;

      // Try to find existing user by email or fingerprint
      if (email) {
        logger.debug('Looking up user by email', { email });
        const emailResult = await client.query(
          'SELECT * FROM qna_users WHERE email = $1',
          [email]
        );
        
        if (emailResult.rows.length > 0) {
          user = this.mapDbUserToQnaUser(emailResult.rows[0]);
          logger.info('User found by email', { userId: user.id, displayName: user.displayName });
          
          // If fingerprint is provided and different, update it
          if (fingerprint && user.fingerprint !== fingerprint) {
            logger.debug('Updating fingerprint for existing user', { 
              userId: user.id, 
              oldFingerprintPrefix: user.fingerprint ? user.fingerprint.substring(0, 8) + '...' : 'none',
              newFingerprintPrefix: fingerprint.substring(0, 8) + '...'
            });
            
            await client.query(
              'UPDATE qna_users SET fingerprint = $1 WHERE id = $2',
              [fingerprint, user.id]
            );
            user.fingerprint = fingerprint;
          }
        }
      } else if (fingerprint) {
        logger.debug('Looking up user by fingerprint', { fingerprintPrefix: fingerprint.substring(0, 8) + '...' });
        const fingerprintResult = await client.query(
          'SELECT * FROM qna_users WHERE fingerprint = $1',
          [fingerprint]
        );
        
        if (fingerprintResult.rows.length > 0) {
          user = this.mapDbUserToQnaUser(fingerprintResult.rows[0]);
          logger.info('User found by fingerprint', { userId: user.id, displayName: user.displayName });
          
          // If email is provided and user doesn't have one, update it
          if (email && !user.email) {
            logger.debug('Adding email to existing fingerprint-based user', { userId: user.id, email });
            await client.query(
              'UPDATE qna_users SET email = $1 WHERE id = $2',
              [email, user.id]
            );
            user.email = email;
          }
        }
      }

      // If user doesn't exist, create a new one
      if (!user) {
        // Generate a unique display name
        let displayName = generateRandomEthName();
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        // Keep trying until we find a unique name or reach max attempts
        while (!isUnique && attempts < maxAttempts) {
          // Check if the display name already exists
          const nameCheckResult = await client.query(
            'SELECT COUNT(*) FROM qna_users WHERE display_name = $1',
            [displayName]
          );
          
          if (nameCheckResult.rows[0].count === '0') {
            isUnique = true;
          } else {
            // If name exists, add a random suffix
            displayName = `${generateRandomEthName()}-${Math.floor(Math.random() * 10000)}`;
            attempts++;
          }
        }
        
        const authToken = crypto.randomBytes(32).toString('hex');

        logger.info('Creating new user', { 
          hasEmail: !!email, 
          hasFingerprint: !!fingerprint,
          displayName,
          nameAttempts: attempts
        });
        
        try {
          const result = await client.query(
            'INSERT INTO qna_users (email, fingerprint, display_name, auth_token) VALUES ($1, $2, $3, $4) RETURNING *',
            [email || null, fingerprint || null, displayName, authToken]
          );

          user = this.mapDbUserToQnaUser(result.rows[0]);
          logger.info('New user created successfully', { userId: user.id, displayName: user.displayName });
        } catch (dbError) {
          logger.error('Error creating new user', dbError);
          throw dbError;
        }
      }

      await client.query('COMMIT');
      return user;
    } catch (error) {
      logger.error('Error in getOrCreateUser transaction', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user's display name
   */
  async updateUserDisplayName(userId: number, displayName: string): Promise<QnaUser> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if the display name is already in use by another user
      const nameCheckResult = await client.query(
        'SELECT COUNT(*) FROM qna_users WHERE display_name = $1 AND id != $2',
        [displayName, userId]
      );
      
      if (nameCheckResult.rows[0].count !== '0') {
        logger.info('Display name already in use', { displayName, userId });
        throw new Error('Display name already in use by another user');
      }
      
      const result = await client.query(
        'UPDATE qna_users SET display_name = $1 WHERE id = $2 RETURNING *',
        [displayName, userId]
      );

      if (result.rows.length === 0) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      const updatedUser = this.mapDbUserToQnaUser(result.rows[0]);
      
      // Broadcast user update to all connected clients
      // This ensures all instances of this user's name are updated in real-time
      sseController.broadcastUserUpdate(userId, { 
        displayName: updatedUser.displayName 
      });
      
      logger.info('User display name updated', { 
        userId, 
        newDisplayName: displayName 
      });
      
      await client.query('COMMIT');
      return updatedUser;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating user display name', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get questions for a specific session
   */
  async getQuestionsBySession(sessionId: string, currentUserId?: number): Promise<QnaQuestion[]> {
    try {
      // Get questions with vote counts and join with users table to get current display names
      const query = `
        SELECT 
          q.id, 
          q.session_id, 
          q.content, 
          q.author_id, 
          u.display_name as author_name, 
          q.created_at,
          COUNT(v.id) as vote_count
        FROM qna_questions q
        LEFT JOIN qna_votes v ON q.id = v.question_id
        LEFT JOIN qna_users u ON q.author_id = u.id
        WHERE q.session_id = $1
        GROUP BY q.id, u.display_name
        ORDER BY vote_count DESC, q.created_at DESC
      `;
      
      const result = await this.pool.query(query, [sessionId]);
      
      // If there's a current user, check which questions they've voted on
      let userVotes: Record<number, boolean> = {};
      if (currentUserId) {
        const votesQuery = `
          SELECT question_id 
          FROM qna_votes 
          WHERE user_id = $1 AND question_id IN (
            SELECT id FROM qna_questions WHERE session_id = $2
          )
        `;
        
        const votesResult = await this.pool.query(votesQuery, [currentUserId, sessionId]);
        userVotes = votesResult.rows.reduce((acc: Record<number, boolean>, row) => {
          acc[row.question_id] = true;
          return acc;
        }, {});
      }
      
      // Map database results to QnaQuestion objects
      return result.rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        content: row.content,
        authorId: row.author_id,
        authorName: row.author_name || 'Anonymous', // Include author name from the join
        votes: parseInt(row.vote_count),
        hasUserVoted: userVotes[row.id] || false,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error in getQuestionsBySession:', error);
      throw error;
    }
  }

  /**
   * Add a new question
   */
  async addQuestion(sessionId: string, content: string, userId: number): Promise<QnaQuestion> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get user info
      const userResult = await client.query(
        'SELECT * FROM qna_users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const user = this.mapDbUserToQnaUser(userResult.rows[0]);

      // Insert question
      const questionResult = await client.query(
        'INSERT INTO qna_questions (session_id, content, author_id) VALUES ($1, $2, $3) RETURNING *',
        [sessionId, content, userId]
      );

      await client.query('COMMIT');

      // Create question object with user data joined
      const newQuestion = {
        id: questionResult.rows[0].id,
        sessionId: questionResult.rows[0].session_id,
        content: questionResult.rows[0].content,
        authorId: questionResult.rows[0].author_id,
        authorName: user.displayName, // Include for frontend compatibility
        votes: 0,
        hasUserVoted: false,
        createdAt: questionResult.rows[0].created_at
      };
      
      // Broadcast the new question to all clients subscribed to this session
      sseController.sendEvent(sessionId, 'question_added', newQuestion);
      
      return newQuestion;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in addQuestion:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Toggle vote on a question
   * Returns true if vote was added, false if vote was removed
   * Returns undefined if no action was taken (e.g., user tried to vote on their own question)
   */
  async toggleVote(questionId: number, userId: number): Promise<boolean | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get the question details including author information
      const questionResult = await client.query(
        'SELECT q.id, q.session_id, q.author_id FROM qna_questions q WHERE q.id = $1',
        [questionId]
      );
      
      if (questionResult.rows.length === 0) {
        throw new Error(`Question with ID ${questionId} not found`);
      }
      
      const question = questionResult.rows[0];
      const sessionId = question.session_id;
      
      // Check if user is the author of the question
      if (question.author_id === userId) {
        // Silently do nothing if user is trying to vote on their own question
        logger.info('User attempted to vote on their own question', { userId, questionId });
        await client.query('COMMIT');
        return undefined;
      }

      // Check if vote exists
      const voteResult = await client.query(
        'SELECT * FROM qna_votes WHERE question_id = $1 AND user_id = $2',
        [questionId, userId]
      );
      
      let voteAdded = false;

      if (voteResult.rows.length > 0) {
        // Vote exists, remove it
        await client.query(
          'DELETE FROM qna_votes WHERE question_id = $1 AND user_id = $2',
          [questionId, userId]
        );
      } else {
        // Vote doesn't exist, add it
        await client.query(
          'INSERT INTO qna_votes (question_id, user_id) VALUES ($1, $2)',
          [questionId, userId]
        );
        voteAdded = true;
      }
      
      // Get updated vote count
      const votesResult = await client.query(
        'SELECT COUNT(*) as vote_count FROM qna_votes WHERE question_id = $1',
        [questionId]
      );
      
      const voteCount = parseInt(votesResult.rows[0].vote_count);

      await client.query('COMMIT');
      
      // Broadcast vote update to all clients subscribed to this session
      sseController.sendEvent(sessionId, 'vote_updated', {
        questionId,
        voteCount,
        voteAdded
      });
      
      return voteAdded;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error in toggleVote:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a question (only if user is the author)
   */
  async deleteQuestion(questionId: number, userId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user is the author
      const questionResult = await client.query(
        'SELECT * FROM qna_questions WHERE id = $1 AND author_id = $2',
        [questionId, userId]
      );

      if (questionResult.rows.length === 0) {
        // User is not the author or question doesn't exist
        await client.query('COMMIT');
        return false;
      }
      
      // Get the session ID for broadcasting
      const sessionId = questionResult.rows[0].session_id;

      // Delete the question
      await client.query(
        'DELETE FROM qna_questions WHERE id = $1',
        [questionId]
      );

      await client.query('COMMIT');
      
      // Broadcast question deletion to all clients subscribed to this session
      sseController.sendEvent(sessionId, 'question_deleted', {
        questionId
      });
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in deleteQuestion:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get leaderboard with caching
   */
  private leaderboardCache: {
    data: LeaderboardEntry[];
    timestamp: number;
  } | null = null;

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    // Check if we have a cached result that's less than 1 minute old
    const now = Date.now();
    if (this.leaderboardCache && (now - this.leaderboardCache.timestamp < 60000)) {
      return this.leaderboardCache.data;
    }

    try {
      // Step 1: Get questions with vote counts and creation time (for tiebreaking)
      const questionsQuery = `
        SELECT 
          q.id as question_id, 
          q.author_id, 
          q.session_id,
          q.created_at,
          COUNT(v.id) as vote_count
        FROM qna_questions q
        LEFT JOIN qna_votes v ON q.id = v.question_id
        GROUP BY q.id
        ORDER BY q.session_id, COUNT(v.id) DESC, q.created_at ASC
      `;
      const questionsResult = await this.pool.query(questionsQuery);
      const questions = questionsResult.rows;

      // Step 2: Find the most voted question for each session (with tiebreaker)
      const sessionTopQuestions = new Map();
      for (const q of questions) {
        const sessionId = q.session_id;
        const voteCount = parseInt(q.vote_count);
        const createdAt = new Date(q.created_at);
        
        if (!sessionTopQuestions.has(sessionId) || 
            voteCount > sessionTopQuestions.get(sessionId).voteCount || 
            (voteCount === sessionTopQuestions.get(sessionId).voteCount && 
             createdAt < sessionTopQuestions.get(sessionId).createdAt)) {
          sessionTopQuestions.set(sessionId, {
            questionId: q.question_id,
            authorId: q.author_id,
            voteCount,
            createdAt
          });
        }
      }

      // Step 3: Calculate scores for each user
      const userScores = new Map();
      
      for (const q of questions) {
        const authorId = q.author_id;
        const voteCount = parseInt(q.vote_count);
        const questionId = q.question_id;
        
        if (!userScores.has(authorId)) {
          userScores.set(authorId, {
            questionsAsked: 0,
            upvotesReceived: 0,
            score: 0
          });
        }
        
        const userData = userScores.get(authorId);
        userData.questionsAsked++;
        userData.upvotesReceived += voteCount;
        
        // Add points based on the scoring rules
        if (voteCount > 0) {
          // 3 points for a question with at least 1 vote
          userData.score += 3;
          
          // 1 point for each additional vote
          if (voteCount > 1) {
            userData.score += (voteCount - 1);
          }
        }
        
        // Check if this is the top question in its session
        for (const [sessionId, topQuestion] of sessionTopQuestions.entries()) {
          if (topQuestion.questionId === questionId && topQuestion.voteCount > 0) {
            // 5 bonus points for the most voted question in a session
            userData.score += 5;
          }
        }
      }
      
      // Step 4: Get user details and create the final leaderboard
      const userIds = Array.from(userScores.keys());
      
      if (userIds.length === 0) {
        this.leaderboardCache = {
          data: [],
          timestamp: now
        };
        return [];
      }
      
      const usersQuery = `
        SELECT id, display_name
        FROM qna_users
        WHERE id = ANY($1)
      `;
      
      const usersResult = await this.pool.query(usersQuery, [userIds]);
      const users = usersResult.rows;
      
      // Create the final leaderboard
      const leaderboard = users.map(user => {
        const userData = userScores.get(user.id);
        return {
          userId: user.id,
          displayName: user.display_name,
          score: userData.score,
          questionsAsked: userData.questionsAsked,
          upvotesReceived: userData.upvotesReceived
        };
      });
      
      // Sort by score (descending)
      leaderboard.sort((a, b) => b.score - a.score);
      
      // Cache the result
      this.leaderboardCache = {
        data: leaderboard,
        timestamp: now
      };
      
      return leaderboard;
    } catch (error) {
      console.error('Error calculating leaderboard:', error);
      // If there's an error, return cached data if available, otherwise empty array
      return this.leaderboardCache?.data || [];
    }
  }

  /**
   * Reset the leaderboard cache for testing purposes
   */
  resetLeaderboardCache(): void {
    this.leaderboardCache = null;
  }

  /**
   * Helper method to map database user to QnaUser
   */
  private mapDbUserToQnaUser(dbUser: any): QnaUser {
    return {
      id: dbUser.id,
      email: dbUser.email,
      displayName: dbUser.display_name,
      authToken: dbUser.auth_token,
      fingerprint: dbUser.fingerprint,
      createdAt: dbUser.created_at
    };
  }
}
