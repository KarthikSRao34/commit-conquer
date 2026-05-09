/**
 * Unit tests for packages/server/src/services/leaderboardService.ts
 * Covers: getLeaderboard, getUserRank
 *
 * LeaderboardService derives data from UserService, so we seed
 * UserService's store directly before each test.
 */

import { LeaderboardService } from '../../../../packages/server/src/services/leaderboardService';
import { UserService } from '../../../../packages/server/src/services/userService';
import { mockUsers } from '../../../fixtures/users';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let userService: UserService;

  beforeEach(() => {
    // Seed the shared user store that LeaderboardService reads from
    userService = new UserService();
    userService._reset([...mockUsers.map((u) => ({ ...u }))]);
    service = new LeaderboardService();
  });

  // ---- getLeaderboard ----
  describe('getLeaderboard()', () => {
    it('returns entries sorted by totalPoints descending', async () => {
      const board = await service.getLeaderboard();
      for (let i = 0; i < board.length - 1; i++) {
        expect(board[i].totalPoints).toBeGreaterThanOrEqual(board[i + 1].totalPoints);
      }
    });

    it('assigns sequential ranks starting at 1', async () => {
      const board = await service.getLeaderboard();
      board.forEach((entry, index) => {
        expect(entry.rank).toBe(index + 1);
      });
    });

    it('top entry has the highest totalPoints among all users', async () => {
      const board = await service.getLeaderboard();
      const maxPoints = Math.max(...mockUsers.map((u) => u.totalPoints));
      expect(board[0].totalPoints).toBe(maxPoints);
    });

    it('respects the limit parameter', async () => {
      const board = await service.getLeaderboard(2);
      expect(board).toHaveLength(2);
    });

    it('returns all users when limit exceeds user count', async () => {
      const board = await service.getLeaderboard(1000);
      expect(board).toHaveLength(mockUsers.length);
    });

    it('returns empty array when no users exist', async () => {
      userService._reset([]);
      const board = await service.getLeaderboard();
      expect(board).toHaveLength(0);
    });

    it('each entry contains all required fields', async () => {
      const board = await service.getLeaderboard();
      board.forEach((entry) => {
        expect(entry).toHaveProperty('rank');
        expect(entry).toHaveProperty('userId');
        expect(entry).toHaveProperty('username');
        expect(entry).toHaveProperty('totalPoints');
        expect(entry).toHaveProperty('commitCount');
      });
    });

    it('uses default limit of 10 when no argument is passed', async () => {
      // Seed 15 users to verify default limit kicks in
      const manyUsers = Array.from({ length: 15 }, (_, i) => ({
        ...mockUsers[0],
        id: `user-extra-${i}`,
        username: `extra${i}`,
        email: `extra${i}@example.com`,
        totalPoints: i * 5,
      }));
      userService._reset(manyUsers);
      const board = await service.getLeaderboard();
      expect(board.length).toBeLessThanOrEqual(10);
    });
  });

  // ---- getUserRank ----
  describe('getUserRank()', () => {
    it('returns rank and totalPoints for a known user', async () => {
      const result = await service.getUserRank('user-1');
      expect(result).not.toBeNull();
      expect(typeof result?.rank).toBe('number');
      expect(typeof result?.totalPoints).toBe('number');
    });

    it('user with highest points receives rank 1', async () => {
      // alice has 100 points — highest in mockUsers
      const result = await service.getUserRank('user-1');
      expect(result?.rank).toBe(1);
    });

    it('user with lowest points receives last rank', async () => {
      // charlie has 50 points — lowest in mockUsers
      const result = await service.getUserRank('user-3');
      expect(result?.rank).toBe(mockUsers.length);
    });

    it('returns null for a user not present in the system', async () => {
      const result = await service.getUserRank('nonexistent-user-id');
      expect(result).toBeNull();
    });

    it('reflects correct totalPoints for the user', async () => {
      const result = await service.getUserRank('user-1');
      const alicePoints = mockUsers.find((u) => u.id === 'user-1')!.totalPoints;
      expect(result?.totalPoints).toBe(alicePoints);
    });
  });
});