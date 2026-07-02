import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  addColumn,
  exportBoardRows,
} from './repository.js';

const router = Router();

router.get('/boards', (req, res) => {
  res.json({ boards: listBoards() });
});

router.post('/boards', (req, res) => {
  try {
    const { title } = req.body || {};
    const board = createBoard(title);
    res.status(201).json({ board });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/boards/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json({ board });
});

router.post('/boards/:id/columns', (req, res) => {
  try {
    const { title, color } = req.body || {};
    const column = addColumn(req.params.id, title, color);
    // Broadcast via socket layer (attached to app.locals)
    const io = req.app.locals.io;
    if (io) io.to(`board:${req.params.id}`).emit('column_added', { column });
    res.status(201).json({ column });
  } catch (err) {
    const status = err.message === 'Board not found' ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.get('/boards/:id/export', (req, res) => {
  const data = exportBoardRows(req.params.id);
  if (!data) return res.status(404).json({ error: 'Board not found' });
  const { board, rows } = data;

  const header = [
    'column',
    'card',
    'card_author',
    'card_created_at',
    'comment',
    'comment_author',
    'comment_created_at',
  ];

  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/["\n,\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv =
    header.join(',') +
    '\n' +
    rows
      .map((r) => header.map((h) => escape(r[h])).join(','))
      .join('\n') +
    (rows.length ? '\n' : '');

  const safeName = (board.title || 'board').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60) || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
  res.send(csv);
});

export default router;
