import express from 'express';
import { boards, columns } from './db.js';
import { boardToCsv } from './csv.js';

const router = express.Router();

router.post('/boards', (req, res) => {
  const title = (req.body?.title ?? '').toString().trim();
  if (!title) {
    return res.status(400).json({ error: 'Board title is required.' });
  }
  if (title.length > 120) {
    return res.status(400).json({ error: 'Board title must be 120 characters or fewer.' });
  }
  const board = boards.create(title);
  res.status(201).json(board);
});

router.get('/boards', (_req, res) => {
  res.json(boards.list());
});

router.get('/boards/:id', (req, res) => {
  const board = boards.getFull(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found.' });
  res.json(board);
});

router.post('/boards/:id/columns', (req, res) => {
  const title = (req.body?.title ?? '').toString().trim();
  if (!title) {
    return res.status(400).json({ error: 'Column title is required.' });
  }
  if (title.length > 80) {
    return res.status(400).json({ error: 'Column title must be 80 characters or fewer.' });
  }
  const column = columns.create(req.params.id, title);
  if (!column) return res.status(404).json({ error: 'Board not found.' });
  res.status(201).json(column);
});

router.get('/boards/:id/export', (req, res) => {
  const board = boards.getFull(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found.' });
  const csv = boardToCsv(board);
  const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="retro-${safeTitle}-${board.id}.csv"`
  );
  res.send(csv);
});

export default router;
