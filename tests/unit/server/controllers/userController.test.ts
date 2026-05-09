/**
 * Unit tests for packages/server/src/controllers/userController.ts
 *
 * UserService is fully mocked so tests only verify controller logic:
 * status codes, response shape, and error forwarding.
 */

/// <reference types="jest" />

import { Request, Response, NextFunction } from 'express';
import { UserController } from '../../../../packages/server/src/controllers/userController';
import { UserService } from '../../../../packages/server/src/services/userService';
import { AppError } from '../../../../packages/server/src/middleware/errorHandler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockUserPublic = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@example.com',
  totalPoints: 100,
  createdAt: new Date('2024-01-01'),
};

function makeMockService(overrides: Partial<UserService> = {}): UserService {
  return {
    findAll: jest.fn().mockResolvedValue([mockUserPublic]),
    findById: jest.fn().mockResolvedValue(mockUserPublic),
    register: jest.fn().mockResolvedValue(mockUserPublic),
    login: jest.fn().mockResolvedValue({ user: mockUserPublic, token: 'mock.jwt.token' }),
    addPoints: jest.fn().mockResolvedValue(undefined),
    _reset: jest.fn(),
    ...overrides,
  } as unknown as UserService;
}

function makeRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return { params: {}, query: {}, body: {}, ...overrides } as Request;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('UserController', () => {
  let service: UserService;
  let controller: UserController;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    service = makeMockService();
    controller = new UserController(service);
    res = makeRes();
    next = jest.fn();
  });

  // ---- getAll ----
  describe('getAll()', () => {
    it('responds 200 with an array of users', async () => {
      await controller.getAll(makeReq(), res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.json as any).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('calls service.findAll once', async () => {
      await controller.getAll(makeReq(), res, next);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('forwards service errors to next()', async () => {
      const error = new AppError('DB down', 500);
      (service.findAll as any).mockRejectedValue(error);
      await controller.getAll(makeReq(), res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ---- getById ----
  describe('getById()', () => {
    it('responds 200 with the correct user', async () => {
      await controller.getById(makeReq({ params: { id: 'user-1' } }), res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.json as any).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.id).toBe('user-1');
    });

    it('calls service.findById with the correct id', async () => {
      await controller.getById(makeReq({ params: { id: 'user-99' } }), res, next);
      expect(service.findById).toHaveBeenCalledWith('user-99');
    });

    it('forwards 404 to next() when user does not exist', async () => {
      const error = new AppError('Not found', 404);
      (service.findById as any).mockRejectedValue(error);
      await controller.getById(makeReq({ params: { id: 'ghost' } }), res, next);
      expect((next as any).mock.calls[0][0].statusCode).toBe(404);
    });
  });

  // ---- register ----
  describe('register()', () => {
    it('responds 201 with the newly created user', async () => {
      await controller.register(
        makeReq({ body: { username: 'newuser', email: 'new@example.com' } }),
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      const payload = (res.json as any).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data).toBeDefined();
    });

    it('calls service.register with the full request body', async () => {
      const body = { username: 'newuser', email: 'new@example.com', password: 'pass' };
      await controller.register(makeReq({ body }), res, next);
      expect(service.register).toHaveBeenCalledWith(body);
    });

    it('forwards 409 conflict to next() when user already exists', async () => {
      const error = new AppError('Already exists', 409);
      (service.register as any).mockRejectedValue(error);
      await controller.register(makeReq(), res, next);
      expect((next as any).mock.calls[0][0].statusCode).toBe(409);
    });

    it('forwards 400 to next() for invalid email', async () => {
      const error = new AppError('Invalid email', 400);
      (service.register as any).mockRejectedValue(error);
      await controller.register(makeReq({ body: { username: 'u', email: 'bad' } }), res, next);
      expect((next as any).mock.calls[0][0].statusCode).toBe(400);
    });
  });

  // ---- login ----
  describe('login()', () => {
    it('responds 200 with user and token', async () => {
      await controller.login(
        makeReq({ body: { email: 'alice@example.com', password: 'password123' } }),
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.json as any).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.token).toBe('mock.jwt.token');
      expect(payload.data.user).toBeDefined();
    });

    it('calls service.login with email and password from body', async () => {
      await controller.login(
        makeReq({ body: { email: 'alice@example.com', password: 'pass123' } }),
        res,
        next,
      );
      expect(service.login).toHaveBeenCalledWith('alice@example.com', 'pass123');
    });

    it('forwards 401 to next() for invalid credentials', async () => {
      const error = new AppError('Invalid credentials', 401);
      (service.login as any).mockRejectedValue(error);
      await controller.login(
        makeReq({ body: { email: 'a@b.com', password: 'wrong' } }),
        res,
        next,
      );
      expect((next as any).mock.calls[0][0].statusCode).toBe(401);
    });
  });
});