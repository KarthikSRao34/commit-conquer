/**
 * packages/server/src/controllers/commitController.ts
 */

import { Request, Response, NextFunction } from 'express';
import { CommitService } from '../services/commitService';
import { parsePagination } from '../utils/pagination';

export class CommitController {
  constructor(private service: CommitService) {}

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query as Record<string, any>);
      const { data, total } = await this.service.findAll({ page, limit });
      res.json({ success: true, data, total });
    } catch (err) {
      next(err);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam!;
      const data = await this.service.findById(id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this.service.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam!;
      await this.service.remove(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}