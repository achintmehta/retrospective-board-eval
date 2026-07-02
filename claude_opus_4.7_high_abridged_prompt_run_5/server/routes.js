import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
  getBoardExportRows,
} from './db.js';

const router = Router();

router.get('/boards', (_req, res) => {
  res.json(listBoards());
});

router.post('/boards', (req, res) => {
  const title = (req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 120)
    return res.status(400).json({ error: 'title too long (max 120)' });
  const board = createBoard(title);
  res.status(201).json(board);
});

router.get('/boards/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(board);
});

router.post('/boards/:id/columns', (req, res) => {
  const title = (req.body?.title || '').trim();
  const color = req.body?.color;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const column = createColumn(req.params.id, title, color);
  if (!column) return res.status(404).json({ error: 'board not found' });
  const io = req.app.get('io');
  if (io) io.to(`board:${req.params.id}`).emit('column_added', { column });
  res.status(201).json(column);
});

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

router.get('/boards/:id/export', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  const rows = getBoardExportRows(req.params.id);

  const header = [
    'Column',
    'Card',
    'Card Author',
    'Card Created At',
    'Comment',
    'Comment Author',
    'Comment Created At',
  ];

  const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="retro_${safeTitle}_${Date.now()}.csv"`
  );

  res.write(header.map(csvEscape).join(',') + '\n');
  for (const r of rows) {
    res.write(
      [
        r.column_title,
        r.card_content,
        r.card_author,
        r.card_created_at ? new Date(r.card_created_at).toISOString() : '',
        r.comment_content,
        r.comment_author,
        r.comment_created_at
          ? new Date(r.comment_created_at).toISOString()
          : '',
      ]
        .map(csvEscape)
        .join(',') + '\n'
    );
  }
  res.end();
});

export default router;
