/**
 * packages/server/src/services/commitService.ts
 */

import { AppError } from '../middleware/errorHandler';

export interface Commit {
  id: string;
  message: string;
  repo: string;
  authorId?: string;
  points: number;
  createdAt: Date;
}

const POINT_MAP: Record<string, number> = {
  feat:     10,
  fix:       8,
  perf:      7,
  refactor:  6,
  test:      5,
  ci:        4,
  docs:      3,
  style:     2,
  chore:     2,
};

export function calculatePoints(message: string): number {
  if (!message) return 0;

  const match = message.match(/^([a-zA-Z]+)(\([^)]+\))?!?:/);
  if (!match) return 1;

  const type = match[1].toLowerCase();
  return POINT_MAP[type] ?? 1;
}

// Module-level in-memory store.
let store: Commit[] = [];
let idCounter = 0;

export class CommitService {
  /** Test helper — resets the store to a known state. */
  _reset(data: Commit[]): void {
    store = data;
    idCounter = data.length;
  }

  async findAll(opts?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: Commit[]; total: number }> {
    const page  = opts?.page  ?? 1;
    const limit = opts?.limit ?? 10;
    const offset = (page - 1) * limit;

    return {
      data:  store.slice(offset, offset + limit),
      total: store.length,
    };
  }

  async findById(id: string): Promise<Commit> {
    const commit = store.find((c) => c.id === id);
    if (!commit) throw new AppError(`Commit ${id} not found`, 404);
    return commit;
  }

  async create(data: {
    message: string;
    repo: string;
    authorId?: string;
  }): Promise<Commit> {
    if (!data.message || !data.message.trim()) {
      throw new AppError('Commit message is required', 400);
    }

    const commit: Commit = {
      id:        `commit-${++idCounter}`,
      message:   data.message,
      repo:      data.repo,
      authorId:  data.authorId,
      points:    calculatePoints(data.message),
      createdAt: new Date(),
    };

    store.push(commit);
    return commit;
  }

  async remove(id: string): Promise<void> {
    const index = store.findIndex((c) => c.id === id);
    if (index === -1) throw new AppError(`Commit ${id} not found`, 404);
    store.splice(index, 1);
  }
}
