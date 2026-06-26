import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoardFull,
  createColumn,
} from './db.js';
import { buildBoardCsv } from './csv.js';

export function createApiRouter() {
  const router = Router();

  router.get('/boards', async (_req, res, next) => {
    try {
      const boards = await listBoards();
      res.json(boards);
    } catch (e) {
      next(e);
    }
  });

  router.post('/boards', async (req, res, next) => {
    try {
      const title = (req.body?.title || '').trim();
      if (!title) return res.status(400).json({ error: 'title is required' });
      const board = await createBoard(title);
      res.status(201).json(board);
    } catch (e) {
      next(e);
    }
  });

  router.get('/boards/:id', async (req, res, next) => {
    try {
      const board = await getBoardFull(req.params.id);
      if (!board) return res.status(404).json({ error: 'Board not found' });
      res.json(board);
    } catch (e) {
      next(e);
    }
  });

  router.post('/boards/:id/columns', async (req, res, next) => {
    try {
      const title = (req.body?.title || '').trim();
      if (!title) return res.status(400).json({ error: 'title is required' });
      const column = await createColumn(req.params.id, title);
      res.status(201).json(column);
    } catch (e) {
      if (e.message === 'Board not found') return res.status(404).json({ error: e.message });
      next(e);
    }
  });

  router.get('/boards/:id/export', async (req, res, next) => {
    try {
      const board = await getBoardFull(req.params.id);
      if (!board) return res.status(404).json({ error: 'Board not found' });
      const csv = buildBoardCsv(board);
      const safeTitle = (board.title || 'board').replace(/[^a-z0-9-_]+/gi, '_');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeTitle}-${board.id}.csv"`
      );
      res.send(csv);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
