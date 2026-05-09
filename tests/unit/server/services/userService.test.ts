/**
 * Unit tests for packages/server/src/services/userService.ts
 * Covers: findAll, findById, register, login, addPoints
 */

import { UserService } from '../../../../packages/server/src/services/userService';
import { mockUsers } from '../../../fixtures/users';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    // Reset to known fixture data before each test
    service._reset([...mockUsers.map((u) => ({ ...u }))]);
  });

  // ---- findAll ----
  describe('findAll()', () => {
    it('returns all users', async () => {
      const users = await service.findAll();
      expect(users).toHaveLength(mockUsers.length);
    });

    it('never exposes passwordHash in results', async () => {
      const users = await service.findAll();
      users.forEach((u) => {
        expect(u).not.toHaveProperty('passwordHash');
      });
    });

    it('returns empty array when store is empty', async () => {
      service._reset([]);
      const users = await service.findAll();
      expect(users).toHaveLength(0);
    });
  });

  // ---- findById ----
  describe('findById()', () => {
    it('returns the correct user for a valid id', async () => {
      const user = await service.findById('user-1');
      expect(user.id).toBe('user-1');
      expect(user.username).toBe('alice');
    });

    it('never exposes passwordHash for found user', async () => {
      const user = await service.findById('user-1');
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('throws 404 AppError for a non-existent id', async () => {
      await expect(service.findById('ghost'))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ---- register ----
  describe('register()', () => {
    it('creates and returns a new user without passwordHash', async () => {
      const user = await service.register({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'pass123',
      });
      expect(user.id).toBeTruthy();
      expect(user.username).toBe('newuser');
      expect(user.email).toBe('newuser@example.com');
      expect(user.totalPoints).toBe(0);
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('throws 409 when email already exists', async () => {
      await expect(
        service.register({ username: 'other', email: 'alice@example.com' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('throws 409 when username already exists', async () => {
      await expect(
        service.register({ username: 'alice', email: 'other@example.com' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('throws 400 for invalid email format', async () => {
      await expect(
        service.register({ username: 'newuser', email: 'not-an-email' }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 when username is empty', async () => {
      await expect(
        service.register({ username: '', email: 'valid@example.com' }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('persists the new user so findById can retrieve it', async () => {
      const created = await service.register({
        username: 'persisted',
        email: 'persisted@example.com',
      });
      const found = await service.findById(created.id);
      expect(found.username).toBe('persisted');
    });

    it('increments user count after registration', async () => {
      const before = (await service.findAll()).length;
      await service.register({ username: 'counter', email: 'counter@example.com' });
      const after = (await service.findAll()).length;
      expect(after).toBe(before + 1);
    });
  });

  // ---- login ----
  describe('login()', () => {
    it('returns user and token for valid credentials', async () => {
      const result = await service.login('alice@example.com', 'password123');
      expect(result.user.email).toBe('alice@example.com');
      expect(result.token).toBeTruthy();
    });

    it('never exposes passwordHash in login result', async () => {
      const result = await service.login('alice@example.com', 'password123');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws 401 for wrong password', async () => {
      await expect(
        service.login('alice@example.com', 'wrongpassword'),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 for non-existent email', async () => {
      await expect(
        service.login('nobody@example.com', 'password'),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('succeeds for each seeded user with correct password', async () => {
      await expect(service.login('bob@example.com', 'secret456')).resolves.toBeDefined();
      await expect(service.login('charlie@example.com', 'mypassword')).resolves.toBeDefined();
    });
  });

  // ---- addPoints ----
  describe('addPoints()', () => {
    it('increments totalPoints for a valid user', async () => {
      const before = (await service.findById('user-1')).totalPoints;
      await service.addPoints('user-1', 10);
      const after = (await service.findById('user-1')).totalPoints;
      expect(after).toBe(before + 10);
    });

    it('handles adding 0 points without changing totalPoints', async () => {
      const before = (await service.findById('user-1')).totalPoints;
      await service.addPoints('user-1', 0);
      const after = (await service.findById('user-1')).totalPoints;
      expect(after).toBe(before);
    });

    it('handles adding large point values', async () => {
      await service.addPoints('user-1', 99_999);
      const user = await service.findById('user-1');
      expect(user.totalPoints).toBeGreaterThan(99_000);
    });

    it('throws 404 AppError when user does not exist', async () => {
      await expect(service.addPoints('ghost', 5))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });
});