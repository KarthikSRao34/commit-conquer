/**
 * Unit tests for packages/server/src/controllers/commitController.ts
 *
 * Controllers are tested in isolation — CommitService is fully mocked
 * so tests only verify controller logic (status codes, response shape,
 * error forwarding) without touching the real service or store.
 */

import { Request, Response, NextFunction } from 'express';
import { jest } from '@jest/globals';
import { CommitController } from '../../../../packages/server/src/controllers/commitController';
import { CommitService } from '../../../../packages/server/src/services/commitService';
import { AppError } from '../../../../packages/server/src/middleware/errorHandler';
import { mockCommits } from '../../../fixtures/commits';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMockService(overrides: Partial<CommitService> = {}): CommitService {
  return {
    findAll: jest.fn<any>().mockResolvedValue({ data: mockCommits, total: mockCommits.length } as any),
    findById: jest.fn<any>().mockResolvedValue(mockCommits[0] as any),
    create: jest.fn<any>().mockResolvedValue(mockCommits[0] as any),
    remove: jest.fn<any>().mockResolvedValue(undefined as any),
    _reset: jest.fn(),
    ...overrides,
  } as unknown as CommitService;
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
describe('CommitController', () => {
  let service: CommitService;
  let controller: CommitController;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    service = makeMockService();
    controller = new CommitController(service);
    res = makeRes();
    next = jest.fn();
  });

  // ---- list ----
  describe('list()', () => {
    it('responds 200 with commit list and total', async () => {
      await controller.list(makeReq({ query: { page: '1', limit: '10' } }), res, next);

      const payload = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.data).toEqual(mockCommits);
      expect(payload.total).toBe(mockCommits.length);
    });

    it('calls service.findAll with parsed pagination options', async () => {
      await controller.list(makeReq({ query: { page: '2', limit: '5' } }), res, next);
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 5 }),
      );
    });

    it('uses default pagination when no query params provided', async () => {
      await controller.list(makeReq({ query: {} }), res, next);
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('forwards service errors to next()', async () => {
      const error = new AppError('DB error', 500);
      (service.findAll as any).mockRejectedValue(error);
      await controller.list(makeReq(), res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ---- get ----
  describe('get()', () => {
    it('responds 200 with the requested commit', async () => {
      await controller.get(makeReq({ params: { id: 'commit-1' } }), res, next);

      const payload = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.data.id).toBe('commit-1');
    });

    it('calls service.findById with the correct id', async () => {
      await controller.get(makeReq({ params: { id: 'commit-99' } }), res, next);
      expect(service.findById).toHaveBeenCalledWith('commit-99');
    });

    it('forwards 404 error to next() when commit is not found', async () => {
      const error = new AppError('Not found', 404);
      (service.findById as any).mockRejectedValue(error);
      await controller.get(makeReq({ params: { id: 'ghost' } }), res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ---- create ----
  describe('create()', () => {
    it('responds 201 with the created commit', async () => {
      const req = {
        ...makeReq({ body: { message: 'feat: new thing', repo: 'my-repo' } }),
      } as any;

      await controller.create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(((res.json as jest.Mock).mock.calls[0][0] as any).success).toBe(true);
    });

    it('forwards service errors to next()', async () => {
      const error = new AppError('Bad request', 400);
      (service.create as any).mockRejectedValue(error);
      await controller.create(makeReq({ body: { message: '', repo: 'repo' } }) as any, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ---- remove ----
  describe('remove()', () => {
    it('responds 204 when commit is successfully removed', async () => {
      // Need to mock send to chain off status
      const mockSend = jest.fn();
      res.status = jest.fn().mockReturnValue({ send: mockSend }) as any;

      await controller.remove(makeReq({ params: { id: 'commit-1' } }) as any, res, next);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(mockSend).toHaveBeenCalled();
    });

    it('calls service.remove with the correct id', async () => {
      await controller.remove(makeReq({ params: { id: 'commit-5' } }) as any, res, next);
      expect(service.remove).toHaveBeenCalledWith('commit-5');
    });

    it('forwards 404 error to next() when commit is not found', async () => {
      const error = new AppError('Not found', 404);
      (service.remove as any).mockRejectedValue(error);
      await controller.remove(makeReq({ params: { id: 'ghost' } }) as any, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});