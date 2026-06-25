import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  addColumn,
  exportBoardCsv,
} from './repository.js';

export function buildApiRouter() {
  const router = Router();

  router.get('/boards', (req, res) => {
    res.json({ boards: listBoards() });
  });

  router.post('/boards', (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (title.length > 120) {
      return res.status(400).json({ error: 'Title is too long (max 120 chars)' });
    }
    const board = createBoard(title);
    res.status(201).json({ board });
  });

  router.get('/boards/:id', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json({ board });
  });

  router.post('/boards/:id/columns', (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const column = addColumn(req.params.id, title);
    if (!column) return res.status(404).json({ error: 'Board not found' });
    res.status(201).json({ column });
  });

  router.get('/boards/:id/export', (req, res) => {
    const result = exportBoardCsv(req.params.id);
    if (!result) return res.status(404).json({ error: 'Board not found' });
    const safeTitle = result.title.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'board';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="retro_${safeTitle}_${Date.now()}.csv"`
    );
    res.send(result.csv);
  });

  return router;
}
