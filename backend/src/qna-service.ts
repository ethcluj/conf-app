import { Pool } from 'pg';
import { QnaUser, QnaQuestion, LeaderboardEntry, generateRandomEthName } from './qna-types';
import crypto from 'crypto';

/**
 * QnA Service - Handles all QnA database operations
 */
export class QnaService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get or create a user based on email or fingerprint
   */
  async getOrCreateUser(email?: string, fingerprint?: string): Promise<QnaUser> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      let user: QnaUser | null = null;

      // Try to find existing user by email or fingerprint
      if (email) {
        const emailResult = await client.query(
          'SELECT * FROM qna_users WHERE email = $1',
          [email]
        );
        if (emailResult.rows.length > 0) {
          user = this.mapDbUserToQnaUser(emailResult.rows[0]);
        }
      } else if (fingerprint) {
        const fingerprintResult = await client.query(
          'SELECT * FROM qna_users WHERE fingerprint = $1',
          [fingerprint]
        );
        if (fingerprintResult.rows.length > 0) {
          user = this.mapDbUserToQnaUser(fingerprintResult.rows[0]);
        }
      }

      // If user doesn't exist, create a new one
      if (!user) {
        const displayName = generateRandomEthName();
        const authToken = crypto.randomBytes(32).toString('hex');

        const result = await client.query(
          'INSERT INTO qna_users (email, display_name, auth_token, fingerprint) VALUES ($1, $2, $3, $4) RETURNING *',
          [email || null, displayName, authToken, fingerprint || null]
        );

        user = this.mapDbUserToQnaUser(result.rows[0]);
      }

      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in getOrCreateUser:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user's display name
   */
  async updateUserDisplayName(userId: number, displayName: string): Promise<QnaUser> {
    const result = await this.pool.query(
      'UPDATE qna_users SET display_name = $1 WHERE id = $2 RETURNING *',
      [displayName, userId]
    );

    if (result.rows.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    return this.mapDbUserToQnaUser(result.rows[0]);
  }

  /**
   * Get questions for a specific session
   */
  async getQuestionsBySession(sessionId: string, currentUserId?: number): Promise<QnaQuestion[]> {
    let query = `
      SELECT 
        q.id, 
        q.session_id, 
        q.content, 
        q.author_id, 
        u.display_name as author_name, 
        q.created_at,
        COUNT(v.id) as votes
    `;

    // Add user vote check if currentUserId is provided
    if (currentUserId) {
      query += `, 
        (SELECT COUNT(*) > 0 FROM qna_votes 
         WHERE question_id = q.id AND user_id = $2) as has_user_voted
      `;
    }

    query += `
      FROM qna_questions q
      JOIN qna_users u ON q.author_id = u.id
      LEFT JOIN qna_votes v ON q.id = v.question_id
      WHERE q.session_id = $1
      GROUP BY q.id, u.display_name
      ORDER BY votes DESC, q.created_at DESC
    `;

    const params = currentUserId ? [sessionId, currentUserId] : [sessionId];
    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      content: row.content,
      authorId: row.author_id,
      authorName: row.author_name,
      votes: parseInt(row.votes),
      hasUserVoted: row.has_user_voted || false,
      createdAt: row.created_at
    }));
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

      return {
        id: questionResult.rows[0].id,
        sessionId: questionResult.rows[0].session_id,
        content: questionResult.rows[0].content,
        authorId: questionResult.rows[0].author_id,
        authorName: user.displayName,
        votes: 0,
        hasUserVoted: false,
        createdAt: questionResult.rows[0].created_at
      };
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
   */
  async toggleVote(questionId: number, userId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

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

      await client.query('COMMIT');
      return voteAdded;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in toggleVote:', error);
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

      // Delete the question
      await client.query(
        'DELETE FROM qna_questions WHERE id = $1',
        [questionId]
      );

      await client.query('COMMIT');
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
   * Get leaderboard
   */
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const query = `
      SELECT 
        u.id as user_id,
        u.display_name,
        (COUNT(DISTINCT q.id) * 3 + COUNT(DISTINCT v.id)) as score,
        COUNT(DISTINCT q.id) as questions_asked,
        COUNT(DISTINCT v.id) as upvotes_received
      FROM qna_users u
      LEFT JOIN qna_questions q ON u.id = q.author_id
      LEFT JOIN qna_votes v ON q.id = v.question_id
      GROUP BY u.id, u.display_name
      HAVING COUNT(DISTINCT q.id) > 0 OR COUNT(DISTINCT v.id) > 0
      ORDER BY score DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query);

    return result.rows.map(row => ({
      userId: row.user_id,
      displayName: row.display_name,
      score: parseInt(row.score),
      questionsAsked: parseInt(row.questions_asked),
      upvotesReceived: parseInt(row.upvotes_received)
    }));
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
