/**
 * SSE Client for real-time updates
 * Connects to the server's SSE endpoint and handles events
 */

import { QnaQuestion } from './qna-data';

// Event handler types
type QuestionAddedHandler = (question: QnaQuestion) => void;
type QuestionDeletedHandler = (data: { questionId: string }) => void;
type VoteUpdatedHandler = (data: { questionId: string, voteCount: number, voteAdded: boolean }) => void;
type UserUpdatedHandler = (data: { userId: string, displayName: string }) => void;

// Event handlers storage
const eventHandlers: {
  question_added: QuestionAddedHandler[];
  question_deleted: QuestionDeletedHandler[];
  vote_updated: VoteUpdatedHandler[];
  user_updated: UserUpdatedHandler[];
} = {
  question_added: [],
  question_deleted: [],
  vote_updated: [],
  user_updated: []
};

// SSE connection state
let eventSource: EventSource | null = null;
let currentSessionId: string | null = null;

/**
 * Connect to the SSE endpoint for a specific session
 * @param sessionId The session ID to subscribe to
 */
export function connectToSSE(sessionId: string): void {
  // Don't reconnect if already connected to the same session
  if (eventSource && currentSessionId === sessionId) {
    // Check if the connection is actually working
    if (eventSource.readyState === EventSource.OPEN) {
      return;
    }
    // If connection is in a closing or closed state, close it properly and reconnect
    eventSource.close();
    eventSource = null;
  }
  
  // Close existing connection if any
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  
  // Store current session ID
  currentSessionId = sessionId;
  
  // Create new EventSource connection
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  eventSource = new EventSource(`${baseUrl}/sse/events/${sessionId}`);
  
  // Connection opened
  eventSource.onopen = () => {
    console.log(`SSE connection opened for session ${sessionId}`);
  };
  
  // Handle incoming messages
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log(`SSE event received: ${data.type}`, data);
      
      // Dispatch event to registered handlers
      if (data.type && Array.isArray(eventHandlers[data.type as keyof typeof eventHandlers])) {
        // Special handling for question_added to ensure timestamp is a Date
        if (data.type === 'question_added' && data.data) {
          const questionData = {
            ...data.data,
            timestamp: data.data.timestamp ? new Date(data.data.timestamp) : 
                      data.data.createdAt ? new Date(data.data.createdAt) : 
                      new Date()
          };
          eventHandlers.question_added.forEach(handler => handler(questionData));
        } else {
          eventHandlers[data.type as keyof typeof eventHandlers].forEach(handler => {
            handler(data.data);
          });
        }
      }
    } catch (error) {
      console.error('Error processing SSE event:', error);
    }
  };
  
  // Handle errors
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    
    // Close the errored connection
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    
    // Attempt to reconnect after a delay with exponential backoff
    const reconnectDelay = Math.min(30000, 1000 * Math.pow(2, Math.floor(Math.random() * 5)));
    console.log(`Will attempt to reconnect in ${reconnectDelay}ms`);
    
    setTimeout(() => {
      if (currentSessionId) {
        console.log(`Attempting to reconnect to session ${currentSessionId}`);
        connectToSSE(currentSessionId);
      }
    }, reconnectDelay);
  };
}

/**
 * Disconnect from the SSE endpoint
 */
export function disconnectFromSSE(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
    currentSessionId = null;
    console.log('SSE connection closed');
  }
}

/**
 * Register a handler for question added events
 * @param handler Function to call when a new question is added
 */
export function onQuestionAdded(handler: (question: QnaQuestion) => void): void {
  const wrappedHandler = (question: any) => {
    // Ensure timestamp is a Date object
    const processedQuestion = {
      ...question,
      timestamp: question.timestamp ? new Date(question.timestamp) : new Date(question.createdAt || Date.now())
    };
    handler(processedQuestion);
  };
  eventHandlers.question_added.push(wrappedHandler);
}

/**
 * Register a handler for question deleted events
 * @param handler Function to call when a question is deleted
 */
export function onQuestionDeleted(handler: QuestionDeletedHandler): void {
  eventHandlers.question_deleted.push(handler);
}

/**
 * Register a handler for vote updated events
 * @param handler Function to call when a vote is added or removed
 */
export function onVoteUpdated(handler: VoteUpdatedHandler): void {
  eventHandlers.vote_updated.push(handler);
}

/**
 * Remove a handler for question added events
 * @param handler The handler to remove
 */
export function offQuestionAdded(handler: QuestionAddedHandler): void {
  const index = eventHandlers.question_added.indexOf(handler);
  if (index !== -1) {
    eventHandlers.question_added.splice(index, 1);
  }
}

/**
 * Remove a handler for question deleted events
 * @param handler The handler to remove
 */
export function offQuestionDeleted(handler: QuestionDeletedHandler): void {
  const index = eventHandlers.question_deleted.indexOf(handler);
  if (index !== -1) {
    eventHandlers.question_deleted.splice(index, 1);
  }
}

/**
 * Remove a handler for vote updated events
 * @param handler The handler to remove
 */
export function offVoteUpdated(handler: VoteUpdatedHandler): void {
  const index = eventHandlers.vote_updated.indexOf(handler);
  if (index !== -1) {
    eventHandlers.vote_updated.splice(index, 1);
  }
}

/**
 * Register a handler for user updated events
 * @param handler Function to call when a user's display name is updated
 */
export function onUserUpdated(handler: UserUpdatedHandler): void {
  eventHandlers.user_updated.push(handler);
}

/**
 * Remove a handler for user updated events
 * @param handler The handler to remove
 */
export function offUserUpdated(handler: UserUpdatedHandler): void {
  const index = eventHandlers.user_updated.indexOf(handler);
  if (index !== -1) {
    eventHandlers.user_updated.splice(index, 1);
  }
}
