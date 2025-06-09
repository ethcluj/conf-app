import { Request, Response } from 'express';

/**
 * SseController class
 * Manages Server-Sent Events connections and broadcasting events to clients
 */
export class SseController {
  // Store active connections by session ID
  private connections: Map<string, Map<string, Response>> = new Map();
  
  /**
   * Initialize SSE connection for a client
   * @param req Express request
   * @param res Express response
   * @param sessionId Session ID to subscribe to
   */
  public initConnection(req: Request, res: Response, sessionId: string): void {
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    });
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
    
    // Generate a unique client ID
    const clientId = req.headers['x-fingerprint'] as string || `client-${Date.now()}-${Math.random()}`;
    
    // Store the connection
    if (!this.connections.has(sessionId)) {
      this.connections.set(sessionId, new Map());
    }
    this.connections.get(sessionId)?.set(clientId, res);
    
    console.log(`[SSE] Client ${clientId} connected to session ${sessionId}`);
    console.log(`[SSE] Total connections for session ${sessionId}: ${this.connections.get(sessionId)?.size || 0}`);
    
    // Handle client disconnect
    req.on('close', () => {
      this.connections.get(sessionId)?.delete(clientId);
      console.log(`[SSE] Client ${clientId} disconnected from session ${sessionId}`);
      console.log(`[SSE] Total connections for session ${sessionId}: ${this.connections.get(sessionId)?.size || 0}`);
      
      // Clean up empty session maps
      if (this.connections.get(sessionId)?.size === 0) {
        this.connections.delete(sessionId);
      }
    });
  }
  
  /**
   * Send an event to all clients subscribed to a session
   * @param sessionId Session ID to broadcast to
   * @param eventType Type of event (question, vote, etc)
   * @param data Event data
   */
  public sendEvent(sessionId: string, eventType: string, data: any): void {
    const sessionConnections = this.connections.get(sessionId);
    if (!sessionConnections || sessionConnections.size === 0) {
      return; // No active connections for this session
    }
    
    const eventData = JSON.stringify({ type: eventType, data });
    
    // Broadcast to all clients for this session
    let successCount = 0;
    let failCount = 0;
    
    sessionConnections.forEach((res, clientId) => {
      try {
        res.write(`data: ${eventData}\n\n`);
        successCount++;
      } catch (error) {
        console.error(`[SSE] Error sending to client ${clientId}:`, error);
        sessionConnections.delete(clientId);
        failCount++;
      }
    });
    
    console.log(`[SSE] Event ${eventType} sent to ${successCount} clients for session ${sessionId} (${failCount} failed)`);
  }
  
  /**
   * Get the number of active connections for a session
   * @param sessionId Session ID
   * @returns Number of active connections
   */
  public getConnectionCount(sessionId: string): number {
    return this.connections.get(sessionId)?.size || 0;
  }
  
  /**
   * Get the total number of active connections across all sessions
   * @returns Total number of active connections
   */
  public getTotalConnectionCount(): number {
    let total = 0;
    this.connections.forEach(sessionMap => {
      total += sessionMap.size;
    });
    return total;
  }
}

// Create a singleton instance
export const sseController = new SseController();
