/**
 * QnA API Service
 * Handles communication with the QnA backend API
 */

import { QnaQuestion, QnaUser, LeaderboardEntry } from './qna-data';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Generate a simple browser fingerprint
// In a real app, we would use a more sophisticated fingerprinting library
const generateFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width,
    screen.height,
    screen.colorDepth
  ];
  
  // Simple hash function
  let hash = 0;
  const str = components.join('');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
};

// Get stored fingerprint or generate a new one
const getFingerprint = (): string => {
  if (typeof window === 'undefined') return '';
  
  let fingerprint = localStorage.getItem('qna_fingerprint');
  if (!fingerprint) {
    fingerprint = generateFingerprint();
    localStorage.setItem('qna_fingerprint', fingerprint);
  }
  return fingerprint;
};

// Get stored auth token
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('qna_auth_token');
};

// Set auth token
const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('qna_auth_token', token);
};

// Clear auth token (logout)
const clearAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('qna_auth_token');
};

// Standard headers for API requests
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Fingerprint': getFingerprint()
  };
  
  const authToken = getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
};

// Custom API error class to preserve structured error details
export class ApiError extends Error {
  status: number;
  data: any;
  
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Handle API response
const handleResponse = async (response: Response) => {
  const data = await response.json();
  
  if (!response.ok) {
    // Extract the most user-friendly error message available
    const errorMessage = data.error || data.message || 'API request failed';
    
    // Throw custom error with all the details preserved
    throw new ApiError(response.status, errorMessage, data);
  }
  
  return data.data;
};

/**
 * Send verification code to email
 */
export const sendVerificationCode = async (email: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/qna/auth/send-code`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      email
    })
  });
  
  await handleResponse(response);
};

/**
 * Verify email code and authenticate user
 */
export const verifyEmailCode = async (email: string, code: string): Promise<QnaUser> => {
  const response = await fetch(`${API_BASE_URL}/qna/auth/verify`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      email,
      code,
      fingerprint: getFingerprint()
    })
  });
  
  const userData = await handleResponse(response);
  
  // Store auth token
  if (userData.authToken) {
    setAuthToken(userData.authToken);
  }
  
  return {
    id: userData.id.toString(),
    displayName: userData.displayName,
    email: userData.email,
    isAuthenticated: true,
    authToken: userData.authToken
  };
};

/**
 * Authenticate with existing token/fingerprint
 * @param email If provided, will create a new user if one doesn't exist. If not provided, will only authenticate existing users.
 */
export const authenticateUser = async (email?: string): Promise<QnaUser> => {
  // If no email is provided and no auth token exists, don't try to authenticate
  // This prevents creating users without explicit authentication
  if (!email && !getAuthToken()) {
    throw new Error('Authentication required');
  }
  
  const response = await fetch(`${API_BASE_URL}/qna/auth`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      email,
      fingerprint: getFingerprint()
    })
  });
  
  const userData = await handleResponse(response);
  
  // Store auth token
  if (userData.authToken) {
    setAuthToken(userData.authToken);
  }
  
  return {
    id: userData.id.toString(),
    displayName: userData.displayName,
    email: userData.email,
    isAuthenticated: true,
    authToken: userData.authToken
  };
};

/**
 * Update user display name
 */
export const updateUserDisplayName = async (displayName: string): Promise<QnaUser> => {
  const response = await fetch(`${API_BASE_URL}/qna/users/display-name`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ displayName })
  });
  
  const userData = await handleResponse(response);
  
  return {
    id: userData.id.toString(),
    displayName: userData.displayName,
    email: userData.email,
    isAuthenticated: true,
    authToken: userData.authToken
  };
};

/**
 * Get questions for a session
 */
export const getQuestionsBySession = async (sessionId: string): Promise<QnaQuestion[]> => {
  const response = await fetch(`${API_BASE_URL}/qna/questions/${sessionId}`, {
    headers: getHeaders()
  });
  
  const questionsData = await handleResponse(response);
  
  return questionsData.map((q: any) => ({
    id: q.id.toString(),
    sessionId: q.sessionId,
    content: q.content,
    authorName: q.authorName,
    authorId: q.authorId.toString(),
    votes: q.votes,
    timestamp: new Date(q.createdAt),
    hasUserVoted: q.hasUserVoted || false
  }));
};

/**
 * Add a new question
 */
export const addQuestion = async (content: string, sessionId: string): Promise<QnaQuestion> => {
  const response = await fetch(`${API_BASE_URL}/qna/questions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ content, sessionId })
  });
  
  const questionData = await handleResponse(response);
  
  return {
    id: questionData.id.toString(),
    sessionId: questionData.sessionId,
    content: questionData.content,
    authorName: questionData.authorName,
    authorId: questionData.authorId.toString(),
    votes: questionData.votes,
    timestamp: new Date(questionData.createdAt),
    hasUserVoted: questionData.hasUserVoted || false
  };
};

/**
 * Toggle vote on a question
 */
export const toggleVote = async (questionId: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/qna/questions/${questionId}/vote`, {
    method: 'POST',
    headers: getHeaders()
  });
  
  const voteData = await handleResponse(response);
  return voteData.voteAdded;
};

/**
 * Delete a question
 */
export const deleteQuestion = async (questionId: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/qna/questions/${questionId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  
  const deleteData = await handleResponse(response);
  return deleteData.deleted;
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const response = await fetch(`${API_BASE_URL}/qna/leaderboard`, {
    headers: getHeaders()
  });
  
  const leaderboardData = await handleResponse(response);
  
  return leaderboardData.map((entry: any) => ({
    userId: entry.userId.toString(),
    displayName: entry.displayName,
    score: entry.score,
    questionsAsked: entry.questionsAsked,
    upvotesReceived: entry.upvotesReceived
  }));
};

/**
 * Logout the current user
 */
export const logout = (): void => {
  clearAuthToken();
  // Also clear the fingerprint to ensure a complete logout
  if (typeof window !== 'undefined') {
    localStorage.removeItem('qna_fingerprint');
  }
};
