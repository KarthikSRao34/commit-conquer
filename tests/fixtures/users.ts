// Local test-safe hashString to avoid importing a missing module
function hashString(s: string): string {
  // simple deterministic placeholder used in fixtures
  return `hashed:${s}`;
}

export type User = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  totalPoints: number;
  createdAt: Date;
};

export const mockUsers: User[] = [
  {
    id: 'user-1',
    username: 'alice',
    email: 'alice@example.com',
    passwordHash: hashString('password123'),
    totalPoints: 100,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'user-2',
    username: 'bob',
    email: 'bob@example.com',
    passwordHash: hashString('secret456'),
    totalPoints: 75,
    createdAt: new Date('2024-01-02'),
  },
  {
    id: 'user-3',
    username: 'charlie',
    email: 'charlie@example.com',
    passwordHash: hashString('mypassword'),
    totalPoints: 50,
    createdAt: new Date('2024-01-03'),
  },
];

export const mockRegisterPayload = {
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'password123',
};

// Used to test validation failures
export const invalidRegisterPayloads = [
  { username: '', email: 'a@b.com' },           // empty username
  { username: 'user', email: '' },               // empty email
  { username: 'user', email: 'not-an-email' },   // bad email format
  {},                                            // completely empty
  { username: 'ab', email: 'a@b.com' },         // username too short
];