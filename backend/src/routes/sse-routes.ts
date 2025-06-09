import express from 'express';
import { sseController } from '../sse-controller';

const router = express.Router();

/**
 * SSE endpoint for subscribing to real-time updates for a specific session
 * Clients connect to this endpoint to receive updates about questions and votes
 */
router.get('/events/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  
  // Initialize SSE connection
  sseController.initConnection(req, res, sessionId);
});

/**
 * Get statistics about active SSE connections
 * Useful for monitoring and debugging
 */
router.get('/stats', (req, res) => {
  const stats = {
    totalConnections: sseController.getTotalConnectionCount(),
    sessionConnections: {} as Record<string, number>
  };
  
  // Return connection stats
  res.json(stats);
});

export default router;
