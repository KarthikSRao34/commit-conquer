/**
 * packages/server/src/services/userService.ts
 */

import { AppError } from '../middleware/errorHandler';
import { isValidEmail } from '../utils/validators';
import { hashString, generateToken } from '../utils/crypto';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  totalPoints: number;
  createdAt: Date;
}

export type PublicUser = Omit<User, 'passwordHash'>;

function toPublic(user: User): PublicUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

// Module-level in-memory store — shared across instances so
// LeaderboardService can read the same data without DI wiring.
let store: User[] = [];
let idCounter = 0;

export class UserService {
  /** Test helper — resets the store to a known state. */
  _reset(data: User[]): void {
    store = data;
    idCounter = data.length;
  }

  async findAll(): Promise<PublicUser[]> {
    return store.map(toPublic);
  }

  async findById(id: string): Promise<PublicUser> {
    const user = store.find((u) => u.id === id);
    if (!user) throw new AppError(`User ${id} not found`, 404);
    return toPublic(user);
  }

  async register(data: {
    username: string;
    email: string;
    password?: string;
  }): Promise<PublicUser> {
    if (!data.username || !data.username.trim()) {
      throw new AppError('Username is required', 400);
    }
    if (!isValidEmail(data.email)) {
      throw new AppError('Invalid email format', 400);
    }
    if (store.some((u) => u.email === data.email)) {
      throw new AppError('Email already in use', 409);
    }
    if (store.some((u) => u.username === data.username)) {
      throw new AppError('Username already in use', 409);
    }

    const user: User = {
      id: `user-${++idCounter}`,
      username: data.username,
      email: data.email,
      passwordHash: hashString(data.password ?? ''),
      totalPoints: 0,
      createdAt: new Date(),
    };

    store.push(user);
    return toPublic(user);
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: PublicUser; token: string }> {
    const user = store.find((u) => u.email === email);
    if (!user || user.passwordHash !== hashString(password)) {
      throw new AppError('Invalid email or password', 401);
    }
    return { user: toPublic(user), token: generateToken(user.id) };
  }

  async addPoints(id: string, points: number): Promise<PublicUser> {
    const user = store.find((u) => u.id === id);
    if (!user) throw new AppError(`User ${id} not found`, 404);
    user.totalPoints += points;
    return toPublic(user);
  }
}