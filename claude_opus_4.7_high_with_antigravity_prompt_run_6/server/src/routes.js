import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getFullBoard,
  createColumn,
} from './repository.js';
import { boardToCsv } from './csv.js';

export function createApiRouter() {
  const router = Router();

  router.get('/boards', (_req, res) => {
    res.json(listBoards());
  });

  router.post('/boards', (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    const board = createBoard(title);
    res.status(201).json(board);
  });

  router.get('/boards/:id', (req, res) => {
    const board = getFullBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  });

  router.post('/boards/:id/columns', (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    const column = createColumn(req.params.id, title);
    if (!column) return res.status(404).json({ error: 'board not found' });
    res.status(201).json(column);
  });

  router.get('/boards/:id/export', (req, res) => {
    const board = getFullBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    const csv = boardToCsv(board);
    const safeName = board.title.replace(/[^a-z0-9_\-]+/gi, '_').slice(0, 50) || 'board';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}-${board.id.slice(0, 8)}.csv"`
    );
    res.send(csv);
  });

  return router;
}
