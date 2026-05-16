import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getFullBoard,
  createColumn,
} from './db.js';
import { generateBoardCsv } from './csv.js';

export function buildRouter(): Router {
  const router = Router();

  router.get('/boards', async (_req, res, next) => {
    try {
      const boards = await listBoards();
      res.json(boards);
    } catch (err) {
      next(err);
    }
  });

  router.post('/boards', async (req, res, next) => {
    try {
      const title = String(req.body?.title ?? '').trim();
      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }
      const board = await createBoard(title);
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  });

  router.get('/boards/:id', async (req, res, next) => {
    try {
      const board = await getFullBoard(req.params.id);
      if (!board) return res.status(404).json({ error: 'board not found' });
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  router.post('/boards/:id/columns', async (req, res, next) => {
    try {
      const title = String(req.body?.title ?? '').trim();
      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }
      const column = await createColumn(req.params.id, title);
      res.status(201).json(column);
    } catch (err) {
      next(err);
    }
  });

  router.get('/boards/:id/export', async (req, res, next) => {
    try {
      const csv = await generateBoardCsv(req.params.id);
      if (csv === null) {
        return res.status(404).json({ error: 'board not found' });
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="board-${req.params.id}.csv"`
      );
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
