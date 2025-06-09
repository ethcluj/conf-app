# Real-Time QnA Updates with Server-Sent Events (SSE)

This document explains how the real-time updates for the ETHCluj Conference QnA system work using Server-Sent Events (SSE).

## Architecture Overview

The real-time update system uses Server-Sent Events (SSE) to push updates from the server to connected clients. This provides a lightweight, one-way communication channel that is ideal for broadcasting updates to multiple clients.

### Key Components

1. **Backend SSE Controller** (`backend/src/sse-controller.ts`)
   - Manages SSE connections per session
   - Tracks active connections
   - Broadcasts events to subscribed clients

2. **SSE Routes** (`backend/src/routes/sse-routes.ts`)
   - Provides endpoints for clients to subscribe to events
   - Offers stats endpoint for monitoring connection counts

3. **Frontend SSE Client** (`ui/lib/sse-client.ts`)
   - Connects to the SSE endpoint
   - Provides event handlers for different update types
   - Manages connection lifecycle

4. **QnA Service Integration** (`backend/src/qna-service.ts`)
   - Emits events when questions are added, deleted, or voted on

## Event Types

The system supports the following event types:

1. **question_added** - Sent when a new question is created
2. **question_deleted** - Sent when a question is deleted
3. **vote_updated** - Sent when a vote is added or removed

## How It Works

1. When a user opens the QnA page or presenter view, the frontend establishes an SSE connection to the server for the specific session.
2. The server keeps track of all connected clients per session.
3. When a user performs an action (adding a question, voting, deleting), the QnA service processes the request and then emits the appropriate event.
4. The SSE controller broadcasts the event to all clients subscribed to that session.
5. The frontend receives the event and updates the UI accordingly without needing to refresh or poll.

## Testing the SSE Functionality

You can test the real-time functionality using the provided test script:

```bash
# Start the backend server
cd backend
npm run dev

# In a separate terminal, run the SSE test script
cd backend
npm run test-sse
```

Then open the QnA page or presenter view in your browser to see the real-time updates.

## Scaling Considerations

The SSE implementation is designed to support up to 300 concurrent connections distributed across multiple sessions. The system:

- Creates separate event channels per session to minimize unnecessary traffic
- Tracks connection counts for monitoring
- Cleans up disconnected clients to prevent memory leaks
- Uses efficient event broadcasting to minimize server load

## Troubleshooting

If real-time updates are not working:

1. Check that the backend server is running
2. Verify that the frontend is connecting to the correct SSE endpoint
3. Check browser console for connection errors
4. Use the `/sse/stats` endpoint to monitor active connections

## Future Improvements

Potential enhancements to the real-time system:

1. Authentication for SSE connections
2. Reconnection with backoff strategy for network interruptions
3. Event replay for missed events
4. WebSocket fallback for environments where SSE is not supported
