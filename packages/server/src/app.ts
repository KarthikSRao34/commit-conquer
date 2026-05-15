/**
 * packages/server/src/app.ts
 */

import express, { Request, Response } from 'express';
import { UserService } from './services/userService';
import { CommitService } from './services/commitService';
import { LeaderboardService } from './services/leaderboardService';
import { UserController } from './controllers/userController';
import { CommitController } from './controllers/commitController';
import { authenticate } from './middleware/authenticate';
import { validateBody } from './middleware/validateBody';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();
  app.use(express.json());

  const userService       = new UserService();
  const commitService     = new CommitService();
  const leaderboardService = new LeaderboardService();

  const userController   = new UserController(userService);
  const commitController = new CommitController(commitService);

  // ── User routes ────────────────────────────────────────────────────────────
  app.get('/api/v1/users', (req, res, next) =>
    userController.list(req, res, next));

  app.get('/api/v1/users/:id', (req, res, next) =>
    userController.get(req, res, next));

  app.post('/api/v1/auth/register',
    validateBody(['username', 'email']),
    (req, res, next) => userController.register(req, res, next),
  );

  app.post('/api/v1/auth/login',
    validateBody(['email', 'password']),
    (req, res, next) => userController.login(req, res, next),
  );

  // ── Commit routes ──────────────────────────────────────────────────────────
  app.get('/api/v1/commits', (req, res, next) =>
    commitController.list(req, res, next));

  app.get('/api/v1/commits/:id', (req, res, next) =>
    commitController.get(req, res, next));

  app.post('/api/v1/commits',
    authenticate,
    validateBody(['message', 'repo']),
    (req, res, next) => commitController.create(req, res, next),
  );

  app.delete('/api/v1/commits/:id',
    authenticate,
    (req, res, next) => commitController.remove(req, res, next),
  );

  // ── Leaderboard routes ─────────────────────────────────────────────────────
  app.get('/api/v1/leaderboard', async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      const data  = await leaderboardService.getLeaderboard(limit);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/v1/leaderboard/:userId', async (req, res, next) => {
    try {
      const data = await leaderboardService.getUserRank(req.params.userId);
      if (!data) {
        return res.status(404).json({ success: false, error: 'User not ranked' });
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  });

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Error handler (must be last) ───────────────────────────────────────────
  app.use(errorHandler);

  return app;
}