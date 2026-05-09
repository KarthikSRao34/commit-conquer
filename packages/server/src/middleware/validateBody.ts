/**
 * packages/server/src/middleware/validateBody.ts
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export function validateBody(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = requiredFields.filter((field) => {
      const value = req.body?.[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return next(new AppError(`Missing required fields: ${missing.join(', ')}`, 400));
    }

    next();
  };
}