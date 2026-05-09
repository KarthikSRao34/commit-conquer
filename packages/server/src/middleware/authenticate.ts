/**
 * packages/server/src/middleware/authenticate.ts
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; username: string };
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers?.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401));
  }

  const token = header.slice(7);

  if (!token || token === 'invalid') {
    return next(new AppError('Unauthorized', 401));
  }

  // Stub: any non-empty, non-"invalid" Bearer token is accepted.
  // Replace this block with real JWT/token verification when ready.
  req.user = { id: 'user-1', username: 'alice' };
  next();
}