import { beforeAll, afterAll, jest } from '@jest/globals';

// Runs before every test file via jest setupFiles
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Suppress noisy Express internal error logs during tests
const originalConsoleError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Unhandled error')) return;
    originalConsoleError(...args);
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});