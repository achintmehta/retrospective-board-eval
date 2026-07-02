import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
} from './db.js';
import { streamBoardCsv } from './export.js';

const router = Router();

router.get('/boards', (req, res) => {
  res.json({ boards: listBoards() });
});

router.post('/boards', (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 120)
    return res.status(400).json({ error: 'title too long' });
  const board = createBoard({ title });
  res.status(201).json({ board });
});

router.get('/boards/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json({ board });
});

router.post('/boards/:id/columns', (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 60)
    return res.status(400).json({ error: 'title too long' });
  const column = createColumn({ boardId: req.params.id, title });
  if (!column) return res.status(404).json({ error: 'board not found' });
  res.status(201).json({ column });
});

router.get('/boards/:id/export', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  const safeName = board.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName || 'board'}.csv"`,
  );
  streamBoardCsv(board, res);
});

export default router;
