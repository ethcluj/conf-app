import express, { Request, Response, Router, NextFunction } from 'express';
import { QnaService } from './qna-service';
import { Pool } from 'pg';
import { emailService } from './email-service';
import { logger } from './logger';

// Using the centralized logger

// Helper functions for API responses
function createSuccessResponse(data: any) {
  return {
    success: true,
    data
  };
}

function createErrorResponse(message: string, details?: any) {
  return {
    success: false,
    error: {
      message,
      ...details
    }
  };
}

/**
 * Create QnA routes
 */
export function createQnaRoutes(pool: Pool): Router {
  const router = express.Router();
  const qnaService = new QnaService(pool);

  // API response standardization
  const createSuccessResponse = (data: any) => ({ success: true, data });
  const createErrorResponse = (message: string, details?: any) => ({ 
    success: false, 
    error: message,
    ...(details && { details })
  });

  // Authentication middleware
  const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authToken = req.headers.authorization?.split(' ')[1];
      const fingerprint = req.headers['x-fingerprint'] as string;
      
      logger.info('Authentication attempt', { 
        hasAuthToken: !!authToken, 
        hasFingerprint: !!fingerprint,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      if (!authToken && !fingerprint) {
        logger.info('Authentication failed - no credentials provided');
        return res.status(401).json(createErrorResponse('Authentication required'));
      }

      let user;
      
      // First try to authenticate with auth token if available
      if (authToken) {
        try {
          // Find user by auth token
          user = await qnaService.getUserByAuthToken(authToken);
          logger.info('User authenticated via auth token', { userId: user.id, displayName: user.displayName });
        } catch (tokenError) {
          logger.error('Error authenticating with token', tokenError);
          // Continue with fingerprint auth if token auth fails
        }
      }
      
      // Fall back to fingerprint if auth token didn't work
      if (!user && fingerprint) {
        user = await qnaService.getOrCreateUser(undefined, fingerprint);
        logger.info('User authenticated via fingerprint', { userId: user.id, displayName: user.displayName });
      }
      
      if (!user) {
        logger.info('Authentication failed - invalid credentials');
        return res.status(401).json(createErrorResponse('Authentication failed'));
      }
      
      // Attach user to request
      (req as any).user = user;
      logger.info('User authenticated successfully', { userId: user.id, displayName: user.displayName });
      next();
    } catch (error) {
      logger.error('Authentication error', error);
      res.status(500).json(createErrorResponse('Authentication failed', { message: (error as Error).message }));
    }
  };

  // Get questions for a session
  router.get('/questions/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const fingerprint = req.headers['x-fingerprint'] as string;
      const authToken = req.headers.authorization?.split(' ')[1];
      
      let currentUserId: number | undefined;
      
      // First try to authenticate with auth token if available
      if (authToken) {
        try {
          // Find user by auth token
          const user = await qnaService.getUserByAuthToken(authToken);
          currentUserId = user.id;
          logger.info('User identified via auth token for questions', { userId: user.id });
        } catch (tokenError) {
          logger.error('Error identifying user with token for questions', tokenError);
          // Continue with fingerprint auth if token auth fails
        }
      }
      
      // Fall back to fingerprint if auth token didn't work or wasn't provided
      if (!currentUserId && fingerprint) {
        const user = await qnaService.getOrCreateUser(undefined, fingerprint);
        currentUserId = user.id;
        logger.info('User identified via fingerprint for questions', { userId: user.id });
      }
      
      const questions = await qnaService.getQuestionsBySession(sessionId, currentUserId);
      res.json(createSuccessResponse(questions));
    } catch (error) {
      console.error('Error getting questions:', error);
      res.status(500).json(createErrorResponse('Failed to get questions', { message: (error as Error).message }));
    }
  });

  // Add a question
  router.post('/questions', authenticateUser, async (req, res) => {
    try {
      const { sessionId, content } = req.body;
      const user = (req as any).user;
      
      if (!sessionId || !content) {
        return res.status(400).json(createErrorResponse('Session ID and content are required'));
      }
      
      const question = await qnaService.addQuestion(sessionId, content, user.id);
      res.status(201).json(createSuccessResponse(question));
    } catch (error) {
      console.error('Error adding question:', error);
      res.status(500).json(createErrorResponse('Failed to add question', { message: (error as Error).message }));
    }
  });

  // Toggle vote on a question
  router.post('/questions/:id/vote', authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      const voteAdded = await qnaService.toggleVote(parseInt(id), user.id);
      
      // Always return a success response, even if no action was taken (e.g., user tried to vote on their own question)
      // This ensures the UI doesn't show any errors when a user tries to vote on their own question
      res.json(createSuccessResponse({ voteAdded: voteAdded === undefined ? false : voteAdded }));
    } catch (error) {
      logger.error('Error toggling vote:', error);
      res.status(500).json(createErrorResponse('Failed to toggle vote', { message: (error as Error).message }));
    }
  });

  // Delete a question
  router.delete('/questions/:id', authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      const deleted = await qnaService.deleteQuestion(parseInt(id), user.id);
      
      if (!deleted) {
        return res.status(403).json(createErrorResponse('Not authorized to delete this question'));
      }
      
      res.json(createSuccessResponse({ deleted: true }));
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json(createErrorResponse('Failed to delete question', { message: (error as Error).message }));
    }
  });

  // Update user display name
  router.put('/users/display-name', authenticateUser, async (req, res) => {
    try {
      const { displayName } = req.body;
      const user = (req as any).user;
      
      if (!displayName) {
        return res.status(400).json(createErrorResponse('Display name is required'));
      }
      
      const updatedUser = await qnaService.updateUserDisplayName(user.id, displayName);
      res.json(createSuccessResponse(updatedUser));
    } catch (error) {
      logger.error('Error updating display name', error);
      res.status(500).json(createErrorResponse('Failed to update display name', { message: (error as Error).message }));
    }
  });
  
  // Send verification code
  router.post('/auth/send-code', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const clientIp = req.ip;
      
      logger.info('Verification code request', { email, ip: clientIp });
      
      if (!email) {
        logger.info('Email missing in verification code request');
        return res.status(400).json(createErrorResponse('Email is required'));
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        logger.info('Invalid email format in verification request', { email });
        return res.status(400).json(createErrorResponse('Invalid email format'));
      }
      
      // Send verification code via email
      try {
        await emailService.sendVerificationCode(email);
        logger.info('Verification code sent successfully', { email });
        res.json(createSuccessResponse({ success: true, message: 'Verification code sent' }));
      } catch (emailError) {
        logger.error('Error in email service while sending verification code', emailError);
        // Check if it's a connection error
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connection')) {
          return res.status(503).json(createErrorResponse('Email service unavailable. Please try again later.'));
        }
        throw emailError; // Re-throw for the outer catch
      }
    } catch (error) {
      logger.error('Error sending verification code', error);
      res.status(500).json(createErrorResponse('Failed to send verification code', { message: (error as Error).message }));
    }
  });
  
  // Verify code and authenticate user
  router.post('/auth/verify', async (req: Request, res: Response) => {
    try {
      const { email, code, fingerprint } = req.body;
      const clientIp = req.ip;
      
      logger.info('Code verification attempt', { email, hasCode: !!code, hasFingerprint: !!fingerprint, ip: clientIp });
      
      if (!email || !code) {
        logger.info('Missing email or code in verification request');
        return res.status(400).json(createErrorResponse('Email and verification code are required'));
      }
      
      // Check attempts remaining before verification
      const attemptsRemaining = emailService.getAttemptsRemaining(email);
      if (attemptsRemaining === 0) {
        logger.info('Maximum verification attempts reached before verification', { email });
        return res.status(401).json(createErrorResponse('Maximum verification attempts reached. Please request a new code.'));
      }
      
      // Verify the code
      const isValid = emailService.verifyCode(email, code);
      
      if (!isValid) {
        // Get updated attempts remaining after the failed verification
        const updatedAttemptsRemaining = emailService.getAttemptsRemaining(email);
        
        if (updatedAttemptsRemaining === -1) {
          // Code was deleted due to max attempts reached
          logger.info('Maximum verification attempts reached', { email });
          return res.status(401).json(createErrorResponse('Maximum verification attempts reached. Please request a new code.'));
        } else {
          // Still has attempts remaining
          logger.info('Invalid verification code', { email, attemptsRemaining: updatedAttemptsRemaining });
          return res.status(401).json(createErrorResponse(
            `Invalid verification code. ${updatedAttemptsRemaining} ${updatedAttemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining.`
          ));
        }
      }
      
      // Create or get user after successful verification
      try {
        const user = await qnaService.getOrCreateUser(email, fingerprint);
        logger.info('User authenticated via email verification', { 
          userId: user.id, 
          email: user.email, 
          displayName: user.displayName 
        });
        
        res.json(createSuccessResponse(user));
      } catch (dbError) {
        logger.error('Database error during user creation/retrieval', dbError);
        throw dbError; // Re-throw for the outer catch
      }
    } catch (error) {
      logger.error('Verification error', error);
      res.status(500).json(createErrorResponse('Verification failed', { message: (error as Error).message }));
    }
  });
  
  // Authentication route - get user by fingerprint or auth token
  router.post('/auth', async (req: Request, res: Response) => {
    try {
      const { email, fingerprint } = req.body;
      const authToken = req.headers.authorization?.split(' ')[1];
      const clientIp = req.ip;
      
      logger.info('Auth check attempt', { 
        hasEmail: !!email, 
        hasFingerprint: !!fingerprint, 
        hasAuthToken: !!authToken,
        ip: clientIp 
      });
      
      if (!email && !fingerprint && !authToken) {
        logger.info('No credentials provided for auth check');
        return res.status(400).json(createErrorResponse('Authentication credentials required'));
      }
      
      // Only return existing users
      let user;

      // First try to authenticate with auth token if available
      if (authToken) {
        try {
          user = await qnaService.getUserByAuthToken(authToken);
          logger.info('User found by auth token', { userId: user.id, displayName: user.displayName });
        } catch (tokenError) {
          logger.error('Error finding user by auth token', tokenError);
          // Continue with fingerprint auth if token auth fails
        }
      }
      
      // Fall back to fingerprint if auth token didn't work
      if (!user && fingerprint) {
        try {
          logger.debug('Attempting to find user by fingerprint', { fingerprint });
          user = await qnaService.getUserByFingerprint(fingerprint);
          logger.info('User found by fingerprint', { userId: user.id, displayName: user.displayName });
        } catch (err) {
          logger.info('User not found by fingerprint', { fingerprint });
          // Only return error if we don't have an email to create a new user
          if (!email) {
            return res.status(401).json(createErrorResponse('Authentication required. Please verify your email.'));
          }
        }
      }
      
      if (!user) {
        logger.info('No user found for authentication');
        return res.status(401).json(createErrorResponse('Authentication required'));
      }
      
      logger.info('User authenticated successfully', { userId: user.id, displayName: user.displayName });
      res.json(createSuccessResponse(user));
    } catch (error) {
      logger.error('Auth error', error);
      res.status(500).json(createErrorResponse('Authentication failed', { message: (error as Error).message }));
    }
  });
  
  // Get leaderboard
  router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
      const leaderboard = await qnaService.getLeaderboard();
      res.json(createSuccessResponse(leaderboard));
    } catch (error) {
      logger.error('Error getting leaderboard', error);
      res.status(500).json(createErrorResponse('Failed to get leaderboard', { message: (error as Error).message }));
    }
  });

  return router;
}
