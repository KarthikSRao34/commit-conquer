/**
 * Integration tests for the full Express application.
 *
 * Uses supertest to make real HTTP requests through the entire
 * middleware → route → controller → service stack.
 * No mocks — tests the system end-to-end in memory.
 */

import { createTestServer, AUTH_TOKEN, INVALID_TOKEN } from '../helpers/testServer';
import { describe, it, beforeEach, expect } from '@jest/globals';
import { CommitService, UserService } from '../../packages/server/src/services';
import { mockCommits } from '../fixtures/commits';
import { mockUsers } from '../fixtures/users';

const { request } = createTestServer();

// Re-seed stores to a clean known state before every test
beforeEach(() => {
  new CommitService()._reset([...mockCommits.map((c) => ({ ...c }))]);
  new UserService()._reset([...mockUsers.map((u) => ({ ...u }))]);
});

// ===========================================================================
// Health check
// ===========================================================================
describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('includes a timestamp in the response', async () => {
    const res = await request.get('/health');
    expect(res.body.timestamp).toBeTruthy();
    expect(() => new Date(res.body.timestamp)).not.toThrow();
  });
});

// ===========================================================================
// 404 / unknown routes
// ===========================================================================
describe('Unknown routes', () => {
  it('returns 404 for an unknown GET route', async () => {
    const res = await request.get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  it('returns 404 for an unknown POST route', async () => {
    const res = await request.post('/api/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 404 for a root path that does not exist', async () => {
    const res = await request.get('/nonexistent');
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// Commits API
// ===========================================================================
describe('GET /api/commits', () => {
  it('returns 200 with a list of commits', async () => {
    const res = await request.get('/api/commits');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('includes pagination meta in the response', async () => {
    const res = await request.get('/api/commits');
    expect(res.body.meta).toBeDefined();
    expect(typeof res.body.meta.total).toBe('number');
    expect(typeof res.body.meta.page).toBe('number');
    expect(typeof res.body.meta.totalPages).toBe('number');
  });

  it('respects page and limit query parameters', async () => {
    const res = await request.get('/api/commits?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.meta.limit).toBe(2);
  });

  it('returns empty data array for an out-of-range page', async () => {
    const res = await request.get('/api/commits?page=999&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /api/commits/:id', () => {
  it('returns 200 with the correct commit', async () => {
    const res = await request.get('/api/commits/commit-1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('commit-1');
  });

  it('returns 404 for a non-existent commit id', async () => {
    const res = await request.get('/api/commits/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/commits', () => {
  it('returns 401 when no auth token is provided', async () => {
    const res = await request
      .post('/api/commits')
      .send({ message: 'feat: test', repo: 'repo' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await request
      .post('/api/commits')
      .set('Authorization', INVALID_TOKEN)
      .send({ message: 'feat: test', repo: 'repo' });
    expect(res.status).toBe(401);
  });

  it('creates a commit and returns 201 when authenticated', async () => {
    const res = await request
      .post('/api/commits')
      .set('Authorization', AUTH_TOKEN)
      .send({ message: 'feat: integration test commit', repo: 'test-repo' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('feat: integration test commit');
  });

  it('assigns correct points for a feat commit', async () => {
    const res = await request
      .post('/api/commits')
      .set('Authorization', AUTH_TOKEN)
      .send({ message: 'feat: new dashboard', repo: 'repo' });
    expect(res.body.data.points).toBe(10);
  });

  it('assigns correct points for a fix commit', async () => {
    const res = await request
      .post('/api/commits')
      .set('Authorization', AUTH_TOKEN)
      .send({ message: 'fix: null pointer', repo: 'repo' });
    expect(res.body.data.points).toBe(8);
  });

  it('returns 400 when message field is missing', async () => {
    const res = await request
      .post('/api/commits')
      .set('Authorization', AUTH_TOKEN)
      .send({ repo: 'repo' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('message');
  });

  it('returns 400 when repo field is missing', async () => {
    const res = await request
      .post('/api/commits')
      .set('Authorization', AUTH_TOKEN)
      .send({ message: 'feat: something' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('repo');
  });

  it('returns 400 when body is completely empty', async () => {
    const res = await request
      .post('/api/commits')
      .set('Authorization', AUTH_TOKEN)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/commits/:id', () => {
  it('returns 401 when no auth token is provided', async () => {
    const res = await request.delete('/api/commits/commit-1');
    expect(res.status).toBe(401);
  });

  it('deletes an existing commit and returns 200', async () => {
    const res = await request
      .delete('/api/commits/commit-1')
      .set('Authorization', AUTH_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('commit is no longer retrievable after deletion', async () => {
    await request
      .delete('/api/commits/commit-1')
      .set('Authorization', AUTH_TOKEN);
    const res = await request.get('/api/commits/commit-1');
    expect(res.status).toBe(404);
  });

  it('returns 404 when commit does not exist', async () => {
    const res = await request
      .delete('/api/commits/nonexistent')
      .set('Authorization', AUTH_TOKEN);
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// Users API
// ===========================================================================
describe('GET /api/users', () => {
  it('returns 200 with a list of users', async () => {
    const res = await request.get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('never exposes passwordHash in the user list', async () => {
    const res = await request.get('/api/users');
    res.body.data.forEach((u: any) => {
      expect(u).not.toHaveProperty('passwordHash');
    });
  });
});

describe('GET /api/users/:id', () => {
  it('returns 200 with the correct user', async () => {
    const res = await request.get('/api/users/user-1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('user-1');
    expect(res.body.data.username).toBe('alice');
  });

  it('does not expose passwordHash for a single user', async () => {
    const res = await request.get('/api/users/user-1');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('returns 404 for an unknown user id', async () => {
    const res = await request.get('/api/users/ghost');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/users/register', () => {
  it('creates a new user and returns 201', async () => {
    const res = await request.post('/api/users/register').send({
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'pass123',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.username).toBe('newuser');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('returns 400 when username is missing', async () => {
    const res = await request
      .post('/api/users/register')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('username');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request
      .post('/api/users/register')
      .send({ username: 'someone' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('email');
  });

  it('returns 409 when email already exists', async () => {
    const res = await request.post('/api/users/register').send({
      username: 'otheralice',
      email: 'alice@example.com',
    });
    expect(res.status).toBe(409);
  });

  it('returns 409 when username already exists', async () => {
    const res = await request.post('/api/users/register').send({
      username: 'alice',
      email: 'brand-new@example.com',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/users/login', () => {
  it('returns 200 with user and token for valid credentials', async () => {
    const res = await request.post('/api/users/login').send({
      email: 'alice@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('alice@example.com');
  });

  it('does not expose passwordHash in login response', async () => {
    const res = await request.post('/api/users/login').send({
      email: 'alice@example.com',
      password: 'password123',
    });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request.post('/api/users/login').send({
      email: 'alice@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request.post('/api/users/login').send({
      email: 'nobody@example.com',
      password: 'password',
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when email field is missing', async () => {
    const res = await request.post('/api/users/login').send({ password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('email');
  });

  it('returns 400 when password field is missing', async () => {
    const res = await request
      .post('/api/users/login')
      .send({ email: 'alice@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('password');
  });
});

// ===========================================================================
// Leaderboard API
// ===========================================================================
describe('GET /api/leaderboard', () => {
  it('returns 200 with ranked entries', async () => {
    const res = await request.get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('entries are sorted by totalPoints descending', async () => {
    const res = await request.get('/api/leaderboard');
    const entries = res.body.data;
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i].totalPoints).toBeGreaterThanOrEqual(entries[i + 1].totalPoints);
    }
  });

  it('rank 1 entry has the highest points', async () => {
    const res = await request.get('/api/leaderboard');
    expect(res.body.data[0].rank).toBe(1);
  });

  it('respects the limit query parameter', async () => {
    const res = await request.get('/api/leaderboard?limit=1');
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });

  it('each entry has required fields', async () => {
    const res = await request.get('/api/leaderboard');
    res.body.data.forEach((entry: any) => {
      expect(entry).toHaveProperty('rank');
      expect(entry).toHaveProperty('userId');
      expect(entry).toHaveProperty('username');
      expect(entry).toHaveProperty('totalPoints');
    });
  });
});

describe('GET /api/leaderboard/user/:userId', () => {
  it('returns 200 with rank and totalPoints for a known user', async () => {
    const res = await request.get('/api/leaderboard/user/user-1');
    expect(res.status).toBe(200);
    expect(res.body.data.rank).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.totalPoints).toBe('number');
  });

  it('alice (user-1) has rank 1 as the highest scorer', async () => {
    const res = await request.get('/api/leaderboard/user/user-1');
    expect(res.body.data.rank).toBe(1);
  });

  it('returns 404 for a user not on the leaderboard', async () => {
    const res = await request.get('/api/leaderboard/user/ghost-user-id');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});