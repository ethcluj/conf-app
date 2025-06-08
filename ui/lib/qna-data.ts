import { type Session } from "./data"
import * as QnaApi from "./qna-api"

export interface QnaUser {
  id: string
  displayName: string
  email?: string
  isAuthenticated: boolean
  authToken?: string
}

export interface QnaQuestion {
  id: string
  sessionId: string
  content: string
  authorName: string
  authorId: string
  votes: number
  timestamp: Date
  hasUserVoted?: boolean
}

// Generate ethereum-themed funny names
const ethereumNames = [
  "GasGuzzler", "BlockMiner", "EtherBunny", "TokenWhisperer",
  "SmartContractor", "HashSlinger", "NodeRunner", "GweiGuru",
  "BytecodeBaron", "SolidityWizard", "ERC20Enthusiast", "GweiRich",
  "EtherDreamer", "OnChainExplorer", "DAppDeveloper", "MerkleTreeHugger",
  "ConsensusBuilder", "ProofOfStaker", "ValidatorVictor", "ZeroKnowledge"
]

export function generateRandomEthName(): string {
  const randomName = ethereumNames[Math.floor(Math.random() * ethereumNames.length)]
  const randomNumber = Math.floor(Math.random() * 1000)
  return `${randomName}${randomNumber}`
}

// Mock current user with random Ethereum-themed name
export const mockCurrentUser: QnaUser = {
  id: 'current-user-id',
  displayName: generateRandomEthName(),
  isAuthenticated: false
}

// Mock questions for testing
export const mockQuestions: QnaQuestion[] = [
  {
    id: "q1",
    sessionId: "session-1",
    content: "How does your project handle transaction finality in layer 2 solutions?",
    authorName: "GasGuzzler42",
    authorId: "user-1",
    votes: 15,
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    hasUserVoted: true
  },
  {
    id: "q2",
    sessionId: "session-1",
    content: "What security audits has your protocol undergone?",
    authorName: "SmartContractor99",
    authorId: "user-2",
    votes: 12,
    timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
    hasUserVoted: false
  },
  {
    id: "q3",
    sessionId: "session-1",
    content: "How do you plan to handle MEV in the upcoming upgrade?",
    authorName: "ProofOfStaker777",
    authorId: "user-3",
    votes: 8,
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    hasUserVoted: false
  },
  {
    id: "q4",
    sessionId: "session-2", // Different session
    content: "What are the implications of EIP-4844 on your protocol?",
    authorName: "ValidatorVictor123",
    authorId: "user-4",
    votes: 3,
    timestamp: new Date(), // Just now
    hasUserVoted: false
  }
]

// Mock leaderboard data
export interface LeaderboardEntry {
  userId: string
  displayName: string
  score: number
  questionsAsked: number
  upvotesReceived: number
}

export const mockLeaderboard: LeaderboardEntry[] = [
  { userId: "user-1", displayName: "GasGuzzler42", score: 82, questionsAsked: 5, upvotesReceived: 27 },
  { userId: "user-3", displayName: "ProofOfStaker777", score: 64, questionsAsked: 3, upvotesReceived: 18 },
  { userId: "user-2", displayName: "SmartContractor99", score: 53, questionsAsked: 4, upvotesReceived: 13 },
  { userId: "user-4", displayName: "ValidatorVictor123", score: 31, questionsAsked: 2, upvotesReceived: 9 },
  { userId: "user-5", displayName: "BytecodeBaron555", score: 24, questionsAsked: 3, upvotesReceived: 6 },
  { userId: "user-6", displayName: "EtherBunny404", score: 21, questionsAsked: 2, upvotesReceived: 5 },
  { userId: "user-7", displayName: "TokenWhisperer007", score: 18, questionsAsked: 2, upvotesReceived: 4 },
  { userId: "user-8", displayName: "NodeRunner42", score: 15, questionsAsked: 1, upvotesReceived: 6 },
  { userId: "user-9", displayName: "GweiGuru123", score: 12, questionsAsked: 2, upvotesReceived: 2 },
  { userId: "user-10", displayName: "MerkleTreeHugger", score: 9, questionsAsked: 1, upvotesReceived: 3 }
]

// Flag to control whether to use mock data or real API
// Set this to false to use the real API
const USE_MOCK_DATA = false;

// Get questions for a specific session
export async function getQuestionsBySession(sessionId: string): Promise<QnaQuestion[]> {
  if (USE_MOCK_DATA) {
    // Use mock data
    return mockQuestions
      .filter(q => q.sessionId === sessionId)
      .sort((a, b) => b.votes - a.votes); // Sort by votes in descending order
  } else {
    // Use real API
    try {
      return await QnaApi.getQuestionsBySession(sessionId);
    } catch (error) {
      console.error('Error fetching questions:', error);
      // Fallback to mock data if API fails
      return mockQuestions
        .filter(q => q.sessionId === sessionId)
        .sort((a, b) => b.votes - a.votes);
    }
  }
}

// Vote handling
export async function toggleVote(questionId: string, userId: string): Promise<QnaQuestion[]> {
  if (USE_MOCK_DATA) {
    // Mock implementation
    const questionIndex = mockQuestions.findIndex(q => q.id === questionId)
    
    if (questionIndex !== -1) {
      const question = mockQuestions[questionIndex]
      
      // Toggle the vote
      if (question.hasUserVoted) {
        question.votes = Math.max(0, question.votes - 1)
        question.hasUserVoted = false
      } else {
        question.votes += 1
        question.hasUserVoted = true
      }
      
      // Sort questions by votes
      return [...mockQuestions].sort((a, b) => b.votes - a.votes)
    }
    
    return mockQuestions
  } else {
    // Real API implementation
    try {
      await QnaApi.toggleVote(questionId);
      // After toggling the vote, fetch the updated questions
      const sessionId = mockQuestions.find(q => q.id === questionId)?.sessionId || '';
      return await QnaApi.getQuestionsBySession(sessionId);
    } catch (error) {
      console.error('Error toggling vote:', error);
      // Fallback to mock implementation
      return toggleVote(questionId, userId);
    }
  }
}

// Delete a question (only if the user is the author)
export async function deleteQuestion(questionId: string, userId: string): Promise<QnaQuestion[]> {
  if (USE_MOCK_DATA) {
    // Mock implementation
    // Find the question index
    const questionIndex = mockQuestions.findIndex(q => q.id === questionId)
    
    if (questionIndex !== -1) {
      const question = mockQuestions[questionIndex]
      
      // Only allow deletion if the user is the author
      if (question.authorId === userId) {
        // Remove the question from the array
        mockQuestions.splice(questionIndex, 1)
      }
    }
    
    // Return the updated questions list
    return [...mockQuestions]
  } else {
    // Real API implementation
    try {
      const sessionId = mockQuestions.find(q => q.id === questionId)?.sessionId || '';
      await QnaApi.deleteQuestion(questionId);
      // After deleting, fetch the updated questions
      return await QnaApi.getQuestionsBySession(sessionId);
    } catch (error) {
      console.error('Error deleting question:', error);
      // Fallback to mock implementation
      return deleteQuestion(questionId, userId);
    }
  }
}

// Add a new question
export async function addQuestion(content: string, sessionId: string, user: QnaUser): Promise<QnaQuestion> {
  if (USE_MOCK_DATA) {
    // Mock implementation
    const newQuestion: QnaQuestion = {
      id: `q${mockQuestions.length + 1}`,
      sessionId,
      content,
      authorName: user.displayName,
      authorId: user.id,
      votes: 0,
      timestamp: new Date(),
      hasUserVoted: false
    }
    
    mockQuestions.push(newQuestion)
    return newQuestion
  } else {
    // Real API implementation
    try {
      return await QnaApi.addQuestion(content, sessionId);
    } catch (error) {
      console.error('Error adding question:', error);
      // Fallback to mock implementation
      const newQuestion: QnaQuestion = {
        id: `q${mockQuestions.length + 1}`,
        sessionId,
        content,
        authorName: user.displayName,
        authorId: user.id,
        votes: 0,
        timestamp: new Date(),
        hasUserVoted: false
      }
      
      mockQuestions.push(newQuestion)
      return newQuestion
    }
  }
}

// Format timestamp relative to now
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  }
}
