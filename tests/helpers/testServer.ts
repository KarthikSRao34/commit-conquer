// @ts-ignore: the server app is provided by a sibling package in the monorepo for tests
import { createApp } from '../../packages/server/src/app';
import supertest from 'supertest';

/**
 * Creates a fresh Express app instance wrapped with supertest.
 * Use this in integration tests to make real HTTP requests.
 */
export function createTestServer() {
  const app = createApp();
  const request = supertest(app);
  return { app, request };
}

// Shared token constants so tests stay consistent
export const AUTH_TOKEN = 'Bearer valid-test-token';
export const INVALID_TOKEN = 'Bearer invalid';