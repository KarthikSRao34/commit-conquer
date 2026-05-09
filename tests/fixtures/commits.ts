// Local Commit type for tests (avoid importing from package path)
interface Commit {
  id: string;
  message: string;
  repo: string;
  authorId?: string;
  points?: number;
  createdAt?: Date;
}

export const mockCommits: Commit[] = [
  {
    id: 'commit-1',
    message: 'feat: add authentication system',
    repo: 'commit-conquer',
    authorId: 'user-1',
    points: 10,
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'commit-2',
    message: 'fix: resolve login bug',
    repo: 'commit-conquer',
    authorId: 'user-2',
    points: 8,
    createdAt: new Date('2024-01-02T10:00:00Z'),
  },
  {
    id: 'commit-3',
    message: 'docs: update README',
    repo: 'other-repo',
    authorId: 'user-1',
    points: 3,
    createdAt: new Date('2024-01-03T10:00:00Z'),
  },
  {
    id: 'commit-4',
    message: 'chore: update dependencies',
    repo: 'commit-conquer',
    authorId: 'user-3',
    points: 2,
    createdAt: new Date('2024-01-04T10:00:00Z'),
  },
];

export const mockCommitPayload = {
  message: 'feat: add new feature',
  repo: 'commit-conquer',
};

// Used to test validation failures
export const invalidCommitPayloads = [
  { message: '', repo: 'commit-conquer' },   // empty message
  { message: 'feat: test', repo: '' },        // empty repo
  { repo: 'commit-conquer' },                 // missing message field
  {},                                         // completely empty
];