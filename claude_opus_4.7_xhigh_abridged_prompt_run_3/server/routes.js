import express from 'express';
import {
  createBoard,
  createColumn,
  getBoard,
  listBoards,
  listCardsForBoard,
  listCommentsForBoard,
  getBoardMeta,
} from './repository.js';
import { buildCsv } from './csv.js';

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

router.get('/boards', (_req, res) => {
  res.json({ boards: listBoards() });
});

router.post('/boards', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (title.length > 120) {
    return res.status(400).json({ error: 'title too long (max 120 chars)' });
  }
  const columns = Array.isArray(req.body?.columns) ? req.body.columns : undefined;
  const board = createBoard({ title, columns });
  res.status(201).json({ board });
});

router.get('/boards/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json({ board });
});

router.post('/boards/:id/columns', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 60) return res.status(400).json({ error: 'title too long (max 60 chars)' });
  const column = createColumn(req.params.id, title);
  if (!column) return res.status(404).json({ error: 'board not found' });
  res.status(201).json({ column });
});

router.get('/boards/:id/export', (req, res) => {
  const board = getBoardMeta(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  const fullBoard = getBoard(req.params.id);
  const csv = buildCsv(fullBoard);
  const safeTitle = fullBoard.title.replace(/[^a-z0-9\-_]+/gi, '_').slice(0, 60) || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeTitle}-${fullBoard.id}.csv"`
  );
  res.send(csv);
});

export default router;
