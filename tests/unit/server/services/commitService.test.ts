/**
 * Unit tests for packages/server/src/services/commitService.ts
 * Covers: calculatePoints (pure fn), findAll, findById, create, remove
 */

import {
  CommitService,
  calculatePoints,
} from '../../../../packages/server/src/services/commitService';
import { mockCommits } from '../../../fixtures/commits';

// ---------------------------------------------------------------------------
// calculatePoints — pure function, no setup needed
// ---------------------------------------------------------------------------
describe('calculatePoints()', () => {
  const cases: [string, number][] = [
    ['feat: add new feature',      10],
    ['fix: resolve bug',            8],
    ['perf: speed up query',        7],
    ['refactor: clean up code',     6],
    ['test: add unit tests',        5],
    ['ci: add pipeline',            4],
    ['docs: update readme',         3],
    ['style: format file',          2],
    ['chore: update deps',          2],
    ['random message no prefix',    1],
    ['',                            0],
  ];

  it.each(cases)('"%s" → %d points', (message, expected) => {
    expect(calculatePoints(message)).toBe(expected);
  });

  it('is case-insensitive for prefix matching', () => {
    expect(calculatePoints('FEAT: upper case')).toBe(10);
    expect(calculatePoints('Fix: mixed case')).toBe(8);
  });

  it('returns 0 for empty string', () => {
    expect(calculatePoints('')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CommitService
// ---------------------------------------------------------------------------
describe('CommitService', () => {
  let service: CommitService;

  beforeEach(() => {
    service = new CommitService();
    // Reset to known fixture data before each test
    service._reset([...mockCommits.map((c) => ({ ...c }))]);
  });

  // ---- findAll ----
  describe('findAll()', () => {
    it('returns all commits with default pagination', async () => {
      const { data, total } = await service.findAll();
      expect(total).toBe(mockCommits.length);
      expect(data.length).toBeLessThanOrEqual(10);
    });

    it('respects page and limit', async () => {
      const { data, total } = await service.findAll({ page: 1, limit: 2 });
      expect(data).toHaveLength(2);
      expect(total).toBe(mockCommits.length);
      expect(data[0].id).toBe('commit-1');
    });

    it('returns second page correctly', async () => {
      const { data } = await service.findAll({ page: 2, limit: 2 });
      expect(data[0].id).toBe('commit-3');
    });

    it('returns empty array for page beyond available data', async () => {
      const { data } = await service.findAll({ page: 999, limit: 10 });
      expect(data).toHaveLength(0);
    });

    it('returns empty array and zero total when store is empty', async () => {
      service._reset([]);
      const { data, total } = await service.findAll();
      expect(data).toHaveLength(0);
      expect(total).toBe(0);
    });
  });

  // ---- findById ----
  describe('findById()', () => {
    it('returns the correct commit for a valid id', async () => {
      const commit = await service.findById('commit-1');
      expect(commit.id).toBe('commit-1');
      expect(commit.message).toBe('feat: add authentication system');
    });

    it('throws 404 AppError for a non-existent id', async () => {
      await expect(service.findById('nonexistent'))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('includes the missing id in the error message', async () => {
      await expect(service.findById('ghost-id'))
        .rejects.toThrow('ghost-id');
    });
  });

  // ---- create ----
  describe('create()', () => {
    it('creates a commit and assigns correct points for feat prefix', async () => {
      const commit = await service.create({
        message: 'feat: brand new thing',
        repo: 'my-repo',
        authorId: 'user-1',
      });
      expect(commit.id).toBeTruthy();
      expect(commit.points).toBe(10);
      expect(commit.createdAt).toBeInstanceOf(Date);
    });

    it('assigns 1 point for non-conventional commit message', async () => {
      const commit = await service.create({
        message: 'random commit message',
        repo: 'my-repo',
        authorId: 'user-1',
      });
      expect(commit.points).toBe(1);
    });

    it('throws 400 AppError for empty message', async () => {
      await expect(
        service.create({ message: '', repo: 'repo', authorId: 'user-1' }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 AppError for whitespace-only message', async () => {
      await expect(
        service.create({ message: '   ', repo: 'repo', authorId: 'user-1' }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('persists the new commit so findById can retrieve it', async () => {
      const created = await service.create({
        message: 'fix: persist test',
        repo: 'repo',
        authorId: 'user-1',
      });
      const found = await service.findById(created.id);
      expect(found.id).toBe(created.id);
    });

    it('increments total count after creation', async () => {
      const before = (await service.findAll()).total;
      await service.create({ message: 'fix: bump', repo: 'repo', authorId: 'user-1' });
      const after = (await service.findAll()).total;
      expect(after).toBe(before + 1);
    });
  });

  // ---- remove ----
  describe('remove()', () => {
    it('removes a commit so it can no longer be found', async () => {
      await service.remove('commit-1');
      await expect(service.findById('commit-1'))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 404 AppError for a non-existent id', async () => {
      await expect(service.remove('nonexistent'))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('decrements total count after removal', async () => {
      const before = (await service.findAll()).total;
      await service.remove('commit-1');
      const after = (await service.findAll()).total;
      expect(after).toBe(before - 1);
    });
  });
});