import { Router } from 'express';
import {
  createBoard,
  createColumn,
  getFullBoard,
  getBoardSummary,
  listBoards,
} from './db.js';
import { csvForBoard } from './export.js';

export function buildRouter() {
  const router = Router();

  // POST /api/boards
  router.post('/boards', (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Board title is required' });
    }
    if (title.length > 120) {
      return res.status(400).json({ error: 'Board title is too long' });
    }
    const board = createBoard(title);
    res.status(201).json(board);
  });

  // GET /api/boards
  router.get('/boards', (_req, res) => {
    res.json(listBoards());
  });

  // GET /api/boards/:id
  router.get('/boards/:id', (req, res) => {
    const board = getFullBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  });

  // POST /api/boards/:id/columns
  router.post('/boards/:id/columns', (req, res) => {
    const boardId = req.params.id;
    const title = (req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Column title is required' });
    }
    if (title.length > 80) {
      return res.status(400).json({ error: 'Column title is too long' });
    }
    if (!getBoardSummary(boardId)) {
      return res.status(404).json({ error: 'Board not found' });
    }
    const column = createColumn(boardId, title);
    res.status(201).json({ ...column, cards: [] });
  });

  // GET /api/boards/:id/export
  router.get('/boards/:id/export', (req, res) => {
    const board = getFullBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    const csv = csvForBoard(board);
    const safeName = board.title.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 50);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName || 'board'}.csv"`,
    );
    res.send(csv);
  });

  return router;
}
