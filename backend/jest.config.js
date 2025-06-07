/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts', // Exclude main entry point
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  // No coverage thresholds to prevent test failures based on coverage metrics
  verbose: true,
};
