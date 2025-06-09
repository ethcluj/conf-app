/**
 * Test script for SSE functionality
 * This script simulates sending events to connected clients
 */

import { sseController } from './sse-controller';

// Sample data
const sessionId = 'test-session';
const questionId = 'test-question-1';

// Sample question data
const sampleQuestion = {
  id: questionId,
  sessionId: sessionId,
  content: 'This is a test question from the SSE test script',
  authorName: 'Test User',
  authorId: 'test-user-1',
  votes: 0,
  createdAt: new Date(),
  hasUserVoted: false
};

// Function to simulate adding a question
function simulateAddQuestion() {
  console.log('Simulating new question...');
  sseController.sendEvent(sessionId, 'question_added', sampleQuestion);
}

// Function to simulate updating votes
function simulateVoteUpdate(increment: boolean) {
  const voteCount = increment ? 1 : 0;
  console.log(`Simulating vote ${increment ? 'added' : 'removed'}...`);
  sseController.sendEvent(sessionId, 'vote_updated', {
    questionId,
    voteCount,
    voteAdded: increment
  });
}

// Function to simulate deleting a question
function simulateDeleteQuestion() {
  console.log('Simulating question deletion...');
  sseController.sendEvent(sessionId, 'question_deleted', {
    questionId
  });
}

// Run the test sequence with delays
console.log('Starting SSE test sequence...');
console.log(`Target session: ${sessionId}`);

// Wait for connections to be established before sending events
setTimeout(() => {
  simulateAddQuestion();
  
  // Add a vote after 3 seconds
  setTimeout(() => {
    simulateVoteUpdate(true);
    
    // Remove the vote after 3 more seconds
    setTimeout(() => {
      simulateVoteUpdate(false);
      
      // Delete the question after 3 more seconds
      setTimeout(() => {
        simulateDeleteQuestion();
        console.log('SSE test sequence completed.');
      }, 3000);
    }, 3000);
  }, 3000);
}, 2000);

// Print connection stats every 5 seconds
const statsInterval = setInterval(() => {
  const sessionConnections = sseController.getConnectionCount(sessionId);
  const totalConnections = sseController.getTotalConnectionCount();
  console.log(`[STATS] Session connections: ${sessionConnections}, Total connections: ${totalConnections}`);
  
  // Stop after 15 seconds
  if (totalConnections === 0) {
    console.log('No active connections. Consider opening the QnA page or presenter view to test.');
  }
}, 5000);

// Stop the stats interval after 30 seconds
setTimeout(() => {
  clearInterval(statsInterval);
  console.log('Test completed. Press Ctrl+C to exit.');
}, 30000);
