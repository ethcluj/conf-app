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
  createdAt?: string | Date  // Added for backend compatibility
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
];

// Get questions for a specific session
export async function getQuestionsBySession(sessionId: string): Promise<QnaQuestion[]> {
  return await QnaApi.getQuestionsBySession(sessionId);
}

// Vote handling
export async function toggleVote(questionId: string, sessionId: string): Promise<QnaQuestion[]> {
  await QnaApi.toggleVote(questionId);
  // After toggling the vote, fetch the updated questions
  return await QnaApi.getQuestionsBySession(sessionId);
}

// Delete a question (only if the user is the author)
export async function deleteQuestion(questionId: string, sessionId: string): Promise<QnaQuestion[]> {
  await QnaApi.deleteQuestion(questionId);
  // After deleting, fetch the updated questions
  return await QnaApi.getQuestionsBySession(sessionId);
}

// Add a new question
export async function addQuestion(content: string, sessionId: string): Promise<QnaQuestion> {
  return await QnaApi.addQuestion(content, sessionId);
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

// Get leaderboard
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return await QnaApi.getLeaderboard();
}
