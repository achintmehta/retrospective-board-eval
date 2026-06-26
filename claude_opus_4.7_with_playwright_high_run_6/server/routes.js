import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
} from './repository.js';
import { boardToCsv } from './csv.js';

export function buildRouter(io) {
  const router = Router();

  router.get('/boards', (req, res) => {
    res.json(listBoards());
  });

  router.post('/boards', (req, res) => {
    try {
      const board = createBoard(req.body?.title);
      res.status(201).json(board);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/boards/:id', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  });

  router.post('/boards/:id/columns', (req, res) => {
    try {
      const column = createColumn(req.params.id, req.body?.title);
      // Broadcast column creation to anyone in the board room
      io.to(`board:${req.params.id}`).emit('column_added', column);
      res.status(201).json(column);
    } catch (err) {
      const status = err.message === 'Board not found' ? 404 : 400;
      res.status(status).json({ error: err.message });
    }
  });

  router.get('/boards/:id/export', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    const csv = boardToCsv(board);
    const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeTitle || 'board'}-${board.id.slice(0, 8)}.csv"`
    );
    res.send(csv);
  });

  return router;
}
