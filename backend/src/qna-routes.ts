import express, { Request, Response, Router } from 'express';
import { QnaService } from './qna-service';
import { Pool } from 'pg';
import { emailService } from './email-service';

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
  const authenticateUser = async (req: Request, res: Response, next: Function) => {
    try {
      const authToken = req.headers.authorization?.split(' ')[1];
      const fingerprint = req.headers['x-fingerprint'] as string;
      
      if (!authToken && !fingerprint) {
        return res.status(401).json(createErrorResponse('Authentication required'));
      }

      // For now, we'll just create or get a user based on the fingerprint
      // In a real implementation, we would verify the auth token
      const user = await qnaService.getOrCreateUser(undefined, fingerprint);
      
      // Attach user to request
      (req as any).user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json(createErrorResponse('Authentication failed', { message: (error as Error).message }));
    }
  };

  // Get questions for a session
  router.get('/questions/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const fingerprint = req.headers['x-fingerprint'] as string;
      
      let currentUserId: number | undefined;
      
      // If fingerprint is provided, get or create user to check their votes
      if (fingerprint) {
        const user = await qnaService.getOrCreateUser(undefined, fingerprint);
        currentUserId = user.id;
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
      res.json(createSuccessResponse({ voteAdded }));
    } catch (error) {
      console.error('Error toggling vote:', error);
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
      console.error('Error updating display name:', error);
      res.status(500).json(createErrorResponse('Failed to update display name', { message: (error as Error).message }));
    }
  });

  // Get leaderboard
  router.get('/leaderboard', async (req, res) => {
    try {
      const leaderboard = await qnaService.getLeaderboard();
      res.json(createSuccessResponse(leaderboard));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      res.status(500).json(createErrorResponse('Failed to get leaderboard', { message: (error as Error).message }));
    }
  });

  // Send verification code
  router.post('/auth/send-code', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json(createErrorResponse('Email is required'));
      }
      
      // Send verification code via email
      await emailService.sendVerificationCode(email);
      
      res.json(createSuccessResponse({ success: true, message: 'Verification code sent' }));
    } catch (error) {
      console.error('Error sending verification code:', error);
      res.status(500).json(createErrorResponse('Failed to send verification code', { message: (error as Error).message }));
    }
  });
  
  // Verify code and authenticate user
  router.post('/auth/verify', async (req: Request, res: Response) => {
    try {
      const { email, code, fingerprint } = req.body;
      
      if (!email || !code) {
        return res.status(400).json(createErrorResponse('Email and verification code are required'));
      }
      
      // Verify the code
      const isValid = emailService.verifyCode(email, code);
      
      if (!isValid) {
        return res.status(401).json(createErrorResponse('Invalid or expired verification code'));
      }
      
      // Create or get user after successful verification
      const user = await qnaService.getOrCreateUser(email, fingerprint);
      
      res.json(createSuccessResponse(user));
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json(createErrorResponse('Verification failed', { message: (error as Error).message }));
    }
  });
  
  // Authentication route - get user by fingerprint only (no creation)
  router.post('/auth', async (req: Request, res: Response) => {
    try {
      const { email, fingerprint } = req.body;
      
      if (!email && !fingerprint) {
        return res.status(400).json(createErrorResponse('Email or fingerprint required'));
      }
      
      // Only return existing users
      let user;
      if (fingerprint) {
        try {
          user = await qnaService.getUserByFingerprint(fingerprint);
        } catch (err) {
          return res.status(401).json(createErrorResponse('Authentication required. Please verify your email.'));
        }
      }
      
      if (!user) {
        return res.status(401).json(createErrorResponse('Authentication required'));
      }
      
      res.json(createSuccessResponse(user));
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json(createErrorResponse('Authentication failed', { message: (error as Error).message }));
    }
  });

  return router;
}
