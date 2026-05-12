// tests/jest.config.js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Set rootDir to repo root so collectCoverageFrom can reach packages/server/src
  // without relying on "../" globs (which ts-jest may not instrument correctly).
  rootDir: '..',

  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.ts',
  ],

  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tests/tsconfig.json',
    }],
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  globalSetup:        '<rootDir>/tests/global-setup.ts',
  globalTeardown:     '<rootDir>/tests/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  testTimeout: 15000,

  // Coverage — rootDir is repo root so these paths resolve correctly
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/packages/server/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory:  '<rootDir>/eval_results/coverage',
  coverageReporters:  ['json-summary', 'text', 'lcov'],
};