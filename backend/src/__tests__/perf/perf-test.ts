import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import axios from 'axios';
import { Worker } from 'worker_threads';

// Types
interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

interface TestParameters {
  questionsPerSession: number;
  upvotesPerSession: number;
  parallelSessions: number;
  sessionPopulationTimeMinutes: number;
  fetchAllSessions: boolean;
}

interface Session {
  id: string;
  name: string;
}

interface User {
  email: string;
  displayName: string;
  authToken: string;
}

interface Config {
  api: ApiConfig;
  parameters: TestParameters;
  sessions: Session[];
  users: User[];
}

interface WorkerData {
  userId: number;
  user: User;
  apiConfig: ApiConfig;
  session: Session;
  questionsPerUser: number;
  upvotesPerUser: number;
  delayBetweenRequestsMs: number;
}

// Load configuration
const loadConfig = (): Config => {
  try {
    const configPath = path.join(__dirname, 'config.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    return yaml.load(fileContents) as Config;
  } catch (error: any) {
    console.error(`Error loading configuration: ${error.message}`);
    throw new Error('Failed to load configuration');
  }
};

// Function to fetch all available sessions from the API
async function fetchAllSessions(apiConfig: ApiConfig): Promise<Session[]> {
  try {
    console.log('Fetching all available sessions from API...');
    const api = axios.create({
      baseURL: apiConfig.baseUrl,
      timeout: apiConfig.timeout
    });
    
    // Make a GET request to the sessions endpoint (at root level, not under /qna)
    const response = await api.get('/sessions');
    
    // Response format according to index.ts: res.json(createSuccessResponse(allSessions));
    // So the data could be either response.data or response.data.data depending on API implementation
    const data = response.data.data || response.data;
    
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid response format from sessions API');
    }
    
    // Transform the response data into Session objects
    const sessions = data.map((session: any) => ({
      id: session.id.toString(),
      name: session.name || `Session ${session.id}`
    }));
    
    console.log(`Found ${sessions.length} sessions`);
    return sessions;
  } catch (error: any) {
    console.error(`Error fetching sessions: ${error.message}`);
    throw new Error('Failed to fetch sessions from API');
  }
};

// Main function
const main = async () => {
  try {
    console.log('\nETHCluj Conference QnA Performance Tests');
    console.log('=======================================\n');
    
    // Load config
    const config = loadConfig();
    console.log(`Loaded configuration with ${config.users.length} users`);
    console.log(`API URL: ${config.api.baseUrl}\n`);
    
    // Determine which sessions to process
    let sessionsToProcess = config.sessions;
    
    // If fetchAllSessions is enabled, get all sessions from the API
    if (config.parameters.fetchAllSessions) {
      try {
        sessionsToProcess = await fetchAllSessions(config.api);
        console.log(`Using ${sessionsToProcess.length} sessions fetched from API`);
      } catch (error: any) {
        console.error(`Failed to fetch sessions: ${error.message}`);
        console.log('Falling back to sessions defined in config file');
      }
    } else {
      console.log(`Using ${sessionsToProcess.length} sessions defined in config file`);
    }
  
    // Process each session
    for (const session of sessionsToProcess) {
      try {
        console.log(`\nPopulating session: ${session.name} (ID: ${session.id})`);
        console.log(`URL: ${config.api.baseUrl}`);
        
        // Calculate workload distribution
        const numUsers = config.users.length;
        const questionsPerUser = Math.ceil(config.parameters.questionsPerSession / numUsers);
        const upvotesPerUser = Math.ceil(config.parameters.upvotesPerSession / numUsers);
        
        // Calculate throttling
        const totalPopulationTimeMs = config.parameters.sessionPopulationTimeMinutes * 60 * 1000;
        const totalOperations = config.parameters.questionsPerSession + config.parameters.upvotesPerSession;
        const delayBetweenRequestsMs = Math.floor(totalPopulationTimeMs / totalOperations);
        
        console.log(`Test parameters:`);
        console.log(`- ${config.parameters.questionsPerSession} questions (~${questionsPerUser} per user)`);
        console.log(`- ${config.parameters.upvotesPerSession} upvotes (~${upvotesPerUser} per user)`);
        console.log(`- Population time: ${config.parameters.sessionPopulationTimeMinutes} minutes`);
        console.log(`- Delay between requests: ${delayBetweenRequestsMs}ms`);
        
        // Start time for this session
        const sessionStartTime = Date.now();
        
        // Create and start worker threads for each user
        const workers: Worker[] = [];
        const promises: Promise<void>[] = [];
    
    config.users.forEach((user, index) => {
      const workerData: WorkerData = {
        userId: index,
        user,
        apiConfig: config.api,
        session,
        questionsPerUser,
        upvotesPerUser,
        delayBetweenRequestsMs,
      };
      
      // Instead of using worker_threads with TypeScript directly,
      // we'll create inline workers with the user's data
      // This avoids the file extension issue
      
      console.log(`[Session ${session.id}] Creating worker for user: ${user.email} (${user.displayName})`);
      const worker = new Worker(`
        const { parentPort, workerData } = require('worker_threads');
        const axios = require('axios');
        
        // User data from parent thread
        const {
          userId: userIndex,
          user,
          apiConfig,
          session,
          questionsPerUser,
          upvotesPerUser,
          delayBetweenRequestsMs,
        } = workerData;
        
        // Set up axios instance
        const api = axios.create({
          baseURL: apiConfig.baseUrl,
          timeout: apiConfig.timeout,
          headers: {
            'Authorization': 'Bearer ' + user.authToken,
            'Content-Type': 'application/json'
          }
        });
        
        // Log message back to parent
        const log = (message) => {
          if (parentPort) {
            parentPort.postMessage(message);
          }
        };
        
        // Generate lorem ipsum text with crypto terms
        function generateLoremIpsum(minChars, maxChars) {
          const loremWords = [
            'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'ethereum', 'blockchain',
            'smart', 'contract', 'token', 'defi', 'nft', 'web3', 'wallet', 'layer2', 'rollup'
          ];
          
          const targetLength = Math.floor(Math.random() * (maxChars - minChars + 1)) + minChars;
          
          let result = '';
          while (result.length < targetLength) {
            const randomWord = loremWords[Math.floor(Math.random() * loremWords.length)];
            result += randomWord + ' ';
          }
          
          result = result.trim();
          if (result.length > maxChars) {
            const lastSpace = result.lastIndexOf(' ');
            if (lastSpace > minChars) {
              result = result.substring(0, lastSpace);
            } else {
              result = result.substring(0, maxChars);
            }
          }
          
          if (Math.random() > 0.5) result += '?';
          return result;
        }
        
        // Helper to delay execution
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        // Update user display name
        async function updateDisplayName() {
          try {
            await api.put('/qna/users/display-name', {
              displayName: user.displayName
            });
            log('Updated display name to: ' + user.displayName);
          } catch (error) {
            log('Failed to update display name: ' + error.message);
            throw error;
          }
        }
        
        // Create a question
        async function createQuestion() {
          try {
            const questionText = generateLoremIpsum(5, 280);
            
            const response = await api.post('/qna/questions', {
              sessionId: session.id,
              content: questionText
            });
            
            return response.data.id;
          } catch (error) {
            log('Failed to create question: ' + error.message);
            throw error;
          }
        }
        
        // Upvote a question
        async function upvoteQuestion(questionId) {
          try {
            await api.post('/qna/questions/' + questionId + '/vote');
          } catch (error) {
            log('Failed to upvote question ' + questionId + ': ' + error.message);
            throw error;
          }
        }
        
        // Main worker function
        async function run() {
          try {
            log('Starting test with user ' + user.email);
            
            // Update display name
            await updateDisplayName();
            
            // Create questions
            const createdQuestionIds = [];
            for (let i = 0; i < questionsPerUser; i++) {
              await delay(delayBetweenRequestsMs);
              const questionId = await createQuestion();
              createdQuestionIds.push(questionId);
              log('Created question ' + (i + 1) + '/' + questionsPerUser + ' with ID: ' + questionId);
            }
            
            // Get all questions for the session
            try {
              const allQuestionsResponse = await api.get('/qna/questions/' + session.id);
              // Normalize the data response based on the API structure
              let allQuestions = Array.isArray(allQuestionsResponse.data) ? 
                allQuestionsResponse.data : 
                (allQuestionsResponse.data?.data || []);
              
              // Upvote questions
              const upvotedQuestions = new Set();
              for (let i = 0; i < upvotesPerUser; i++) {
                await delay(delayBetweenRequestsMs);
                
                    // Filter questions that haven't been upvoted yet by this user
                // In a real environment, the API returns the userId of each question
                // so we can filter out the current user's questions
                const candidateQuestions = allQuestions.filter(q => 
                  // Don't upvote questions we've already upvoted
                  !upvotedQuestions.has(q.id) && 
                  // Avoid errors when question structure doesn't match expectations
                  q && q.id);
                
                // If all questions have been upvoted, break
                if (candidateQuestions.length === 0) {
                  log('No more questions to upvote. Completed ' + i + ' upvotes.');
                  break;
                }
                
                const randomIndex = Math.floor(Math.random() * candidateQuestions.length);
                const questionToUpvote = candidateQuestions[randomIndex].id;
                
                await upvoteQuestion(questionToUpvote);
                upvotedQuestions.add(questionToUpvote);
                log('Upvoted question ' + (i + 1) + '/' + upvotesPerUser + ' with ID: ' + questionToUpvote);
              }
            } catch (error) {
              log('Error fetching questions for upvoting: ' + error.message + '. Will skip voting.');
            }
            
            log('Completed all operations for user ' + user.email);
            if (parentPort) parentPort.postMessage('DONE');
          } catch (error) {
            log('Error in worker: ' + error.message);
            throw error;
          }
        }
        
        // Start the worker
        run().catch(error => {
          console.error('Worker error: ' + error.message);
          process.exit(1);
        });
      `, {
        eval: true,
        workerData
      });
      
      workers.push(worker);
      
      // Create promise for this worker
      const promise = new Promise<void>((resolve, reject) => {
        worker.on('message', (message) => {
          console.log(`[User ${index + 1}] ${message}`);
        });
        
        worker.on('error', (err) => {
          console.error(`[User ${index + 1}] Error: ${err.message}`);
          reject(err);
        });
        
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          } else {
            resolve();
          }
        });
      });
      
      promises.push(promise);
    });
    
    // Wait for all workers to complete
    await Promise.all(promises).catch(err => {
      console.error(`Error in worker threads: ${err.message}`);
    });
    
        // Calculate session statistics
        const sessionEndTime = Date.now();
        const sessionDurationMs = sessionEndTime - sessionStartTime;
        console.log(`\nSession ${session.name} completed in ${sessionDurationMs / 1000} seconds`);
      } catch (error: unknown) {
        console.error(`Error processing session ${session.id}:`, error);
      }
    }
  } catch (error: unknown) {
    console.error('Error running performance tests:', error);
    process.exit(1);
  }
};

// Run the performance tests
main().catch((error: unknown) => {
  console.error('Error running performance tests:', error);
  process.exit(1);
});
