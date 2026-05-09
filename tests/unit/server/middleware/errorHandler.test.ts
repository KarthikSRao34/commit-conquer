/**
 * Unit tests for packages/server/src/middleware/errorHandler.ts
 * Covers: AppError class, errorHandler middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  AppError,
} from '../../../../packages/server/src/middleware/errorHandler';

function makeMocks() {
  const req = {} as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

// ---------------------------------------------------------------------------
// AppError class
// ---------------------------------------------------------------------------
describe('AppError', () => {
  it('sets message and statusCode correctly', () => {
    const err = new AppError('Something went wrong', 400);
    expect(err.message).toBe('Something went wrong');
    expect(err.statusCode).toBe(400);
  });

  it('defaults isOperational to true', () => {
    const err = new AppError('Oops', 500);
    expect(err.isOperational).toBe(true);
  });

  it('allows overriding isOperational to false', () => {
    const err = new AppError('Programming error', 500, false);
    expect(err.isOperational).toBe(false);
  });

  it('is an instance of Error', () => {
    expect(new AppError('test', 400)).toBeInstanceOf(Error);
  });

  it('captures a stack trace', () => {
    expect(new AppError('test', 400).stack).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// errorHandler middleware
// ---------------------------------------------------------------------------
describe('errorHandler middleware', () => {
  const OLD_ENV = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = OLD_ENV;
  });

  it('uses the AppError statusCode when error is an AppError', () => {
    const { req, res, next } = makeMocks();
    errorHandler(new AppError('Not found', 404), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('responds with the AppError message', () => {
    const { req, res, next } = makeMocks();
    errorHandler(new AppError('Validation failed', 400), req, res, next);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Validation failed' });
  });

  it('responds 401 for unauthorized AppError', () => {
    const { req, res, next } = makeMocks();
    errorHandler(new AppError('Unauthorized', 401), req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('responds 500 with generic message for unknown errors in production', () => {
    process.env.NODE_ENV = 'production';
    const { req, res, next } = makeMocks();
    errorHandler(new Error('DB crashed'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal Server Error',
    });
  });

  it('exposes the real error message in non-production', () => {
    process.env.NODE_ENV = 'test';
    const { req, res, next } = makeMocks();
    errorHandler(new Error('Detailed internal error'), req, res, next);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toBe('Detailed internal error');
  });

  it('always sets success: false in the response body', () => {
    const { req, res, next } = makeMocks();
    errorHandler(new AppError('err', 400), req, res, next);
    expect((res.json as jest.Mock).mock.calls[0][0].success).toBe(false);
  });
});