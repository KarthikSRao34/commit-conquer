// Types used by the mocks — define inline to avoid a missing './types' module.
export interface Commit {
  id: string;
  message: string;
  repo: string;
  authorId: string;
  points: number;
  createdAt: Date;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  totalPoints: number;
  createdAt: Date;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalPoints: number;
  commitCount: number;
}

let idCounter = 1;

/**
 * Creates a mock Commit with sensible defaults.
 * Pass overrides to customise specific fields per test.
 */
export function createMockCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    id: `commit-${idCounter++}`,
    message: 'feat: test commit',
    repo: 'test-repo',
    authorId: 'user-1',
    points: 10,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock User with sensible defaults.
 * Never includes a real passwordHash — safe for assertion comparisons.
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const id = idCounter++;
  return {
    id: `user-${id}`,
    username: `testuser${id}`,
    email: `testuser${id}@example.com`,
    passwordHash: 'hashedpassword',
    totalPoints: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock LeaderboardEntry with sensible defaults.
 */
export function createMockLeaderboardEntry(
  overrides: Partial<LeaderboardEntry> = {},
): LeaderboardEntry {
  return {
    rank: 1,
    userId: 'user-1',
    username: 'alice',
    totalPoints: 100,
    commitCount: 10,
    ...overrides,
  };
}

/** Call this in beforeEach to keep generated IDs deterministic across tests. */
export function resetIdCounter() {
  idCounter = 1;
}