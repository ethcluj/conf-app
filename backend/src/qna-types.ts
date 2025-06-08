/**
 * QnA system types
 */

export interface QnaUser {
  id: number;
  email?: string;
  displayName: string;
  authToken?: string;
  fingerprint?: string;
  createdAt: Date;
}

export interface QnaQuestion {
  id: number;
  sessionId: string;
  content: string;
  authorId: number;
  authorName: string;
  votes: number; // Calculated field
  hasUserVoted?: boolean; // Calculated field for the current user
  createdAt: Date;
}

export interface QnaVote {
  id: number;
  questionId: number;
  userId: number;
  createdAt: Date;
}

export interface LeaderboardEntry {
  userId: number;
  displayName: string;
  score: number;
  questionsAsked: number;
  upvotesReceived: number;
}

// Ethereum-themed names for random generation
export const ethereumNames = [
  "GasGuzzler", "BlockMiner", "EtherBunny", "TokenWhisperer",
  "SmartContractor", "HashSlinger", "NodeRunner", "GweiGuru",
  "BytecodeBaron", "SolidityWizard", "ERC20Enthusiast", "GweiRich",
  "EtherDreamer", "OnChainExplorer", "DAppDeveloper", "MerkleTreeHugger",
  "ConsensusBuilder", "ProofOfStaker", "ValidatorVictor", "ZeroKnowledge"
];

/**
 * Generate a random Ethereum-themed display name
 */
export function generateRandomEthName(): string {
  const randomName = ethereumNames[Math.floor(Math.random() * ethereumNames.length)];
  const randomNumber = Math.floor(Math.random() * 1000);
  return `${randomName}${randomNumber}`;
}
