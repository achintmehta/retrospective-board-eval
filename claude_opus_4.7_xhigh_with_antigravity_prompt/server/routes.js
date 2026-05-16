import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
  ValidationError,
  NotFoundError,
} from './repository.js';
import { boardToCsv } from './csv.js';
import { roomFor } from './socket.js';

export function createApiRouter({ io } = {}) {
  const router = Router();

  // POST /api/boards
  router.post('/boards', (req, res, next) => {
    try {
      const board = createBoard({ title: req.body?.title });
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/boards
  router.get('/boards', (_req, res, next) => {
    try {
      res.json(listBoards());
    } catch (err) {
      next(err);
    }
  });

  // GET /api/boards/:id
  router.get('/boards/:id', (req, res, next) => {
    try {
      const board = getBoard(req.params.id);
      if (!board) return res.status(404).json({ error: 'Board not found' });
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/boards/:id/columns
  router.post('/boards/:id/columns', (req, res, next) => {
    try {
      const column = createColumn({
        boardId: req.params.id,
        title: req.body?.title,
      });
      if (io) io.to(roomFor(req.params.id)).emit('column_added', { column });
      res.status(201).json(column);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/boards/:id/export
  router.get('/boards/:id/export', (req, res, next) => {
    try {
      const board = getBoard(req.params.id);
      if (!board) return res.status(404).json({ error: 'Board not found' });
      const csv = boardToCsv(board);
      const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60) || 'board';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="retro_${safeTitle}_${board.id}.csv"`
      );
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  // Error handler scoped to API routes
  router.use((err, _req, res, _next) => {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
    console.error('[api]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return router;
}
