/**
 * packages/server/src/controllers/userController.ts
 */

import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';

export class UserController {
  constructor(private service: UserService) {}

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this.service.findAll();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = await this.service.findById(id as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this.service.register(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await this.service.login(email, password);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}