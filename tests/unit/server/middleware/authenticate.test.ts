/**
 * Unit tests for packages/server/src/middleware/authenticate.ts
 * Covers: valid token, missing header, invalid token, wrong scheme
 */

import { Response, NextFunction } from 'express';
import {
  authenticate,
  AuthenticatedRequest,
} from '../../../../packages/server/src/middleware/authenticate';
import { AppError } from '../../../../packages/server/src/middleware/errorHandler';

function makeMocks(authHeader?: string) {
  const req = {
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
  } as AuthenticatedRequest;
  const res = {} as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('authenticate middleware', () => {
  it('calls next() with no error for a valid Bearer token', () => {
    const { req, res, next } = makeMocks('Bearer some-valid-token');
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('attaches user object to req when token is valid', () => {
    const { req, res, next } = makeMocks('Bearer some-valid-token');
    authenticate(req, res, next);
    expect(req.user).toBeDefined();
    expect(req.user?.id).toBe('user-1');
    expect(req.user?.username).toBeTruthy();
  });

  it('calls next(AppError 401) when Authorization header is missing', () => {
    const { req, res, next } = makeMocks(undefined);
    authenticate(req, res, next);
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('calls next(AppError 401) when token value is "invalid"', () => {
    const { req, res, next } = makeMocks('Bearer invalid');
    authenticate(req, res, next);
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });

  it('calls next(AppError 401) when scheme is Basic instead of Bearer', () => {
    const { req, res, next } = makeMocks('Basic dXNlcjpwYXNz');
    authenticate(req, res, next);
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });

  it('calls next(AppError 401) when Authorization header is empty string', () => {
    const { req, res, next } = makeMocks('');
    authenticate(req, res, next);
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });

  it('does not attach user to req when authentication fails', () => {
    const { req, res, next } = makeMocks(undefined);
    authenticate(req, res, next);
    expect(req.user).toBeUndefined();
  });
});