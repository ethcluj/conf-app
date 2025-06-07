// Test setup file
import dotenv from 'dotenv';

// Load environment variables from .env.test if it exists
dotenv.config({ path: '.env.test' });

// Mock environment variables for testing
process.env.GOOGLE_SHEET_ID = 'test-sheet-id';
process.env.GOOGLE_SHEET_NAME = 'test-sheet-name';
process.env.GOOGLE_SPEAKERS_SHEET_NAME = 'test-speakers-sheet';
process.env.GOOGLE_API_KEY = 'test-api-key';

// Global mocks and setup can be added here
