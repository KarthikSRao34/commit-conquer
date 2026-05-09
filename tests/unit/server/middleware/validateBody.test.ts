/**
 * Unit tests for packages/server/src/middleware/validateBody.ts
 * Covers: required field presence, empty string rejection, error messages
 */

import { Request, Response, NextFunction } from 'express';
import { validateBody } from '../../../../packages/server/src/middleware/validateBody';
import { AppError } from '../../../../packages/server/src/middleware/errorHandler';

function makeMocks(body: Record<string, unknown> = {}) {
  const req = { body } as Request;
  const res = {} as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('validateBody middleware', () => {
  it('calls next() with no args when all required fields are present', () => {
    const { req, res, next } = makeMocks({ message: 'hello', repo: 'test' });
    validateBody(['message', 'repo'])(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(AppError 400) when a required field is missing', () => {
    const { req, res, next } = makeMocks({ message: 'hello' }); // missing repo
    validateBody(['message', 'repo'])(req, res, next);
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('repo');
  });

  it('calls next(AppError) when body is completely empty', () => {
    const { req, res, next } = makeMocks({});
    validateBody(['username', 'email'])(req, res, next);
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.message).toContain('username');
    expect(err.message).toContain('email');
  });

  it('rejects a field that is present but an empty string', () => {
    const { req, res, next } = makeMocks({ message: '', repo: 'test' });
    validateBody(['message', 'repo'])(req, res, next);
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('message');
  });

  it('calls next() with no args when no required fields are specified', () => {
    const { req, res, next } = makeMocks({});
    validateBody([])(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('lists ALL missing fields in the error message', () => {
    const { req, res, next } = makeMocks({});
    validateBody(['a', 'b', 'c'])(req, res, next);
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.message).toContain('a');
    expect(err.message).toContain('b');
    expect(err.message).toContain('c');
  });

  it('accepts fields with falsy but valid values (0 and false)', () => {
    const { req, res, next } = makeMocks({ count: 0, active: false });
    validateBody(['count', 'active'])(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('returns status 400 in the error', () => {
    const { req, res, next } = makeMocks({ only: 'one' });
    validateBody(['only', 'missing'])(req, res, next);
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
  });
});