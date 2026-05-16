import express from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
  exportBoardRows,
} from './db.js';

export function buildRouter() {
  const router = express.Router();

  router.get('/boards', (_req, res) => {
    res.json(listBoards());
  });

  router.post('/boards', (req, res) => {
    const title = (req.body?.title || '').toString().trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    const board = createBoard(title);
    res.status(201).json(board);
  });

  router.get('/boards/:id', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  });

  router.post('/boards/:id/columns', (req, res) => {
    const title = (req.body?.title || '').toString().trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    const column = createColumn(req.params.id, title);
    if (!column) return res.status(404).json({ error: 'board not found' });
    res.status(201).json(column);
  });

  router.get('/boards/:id/export', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    const rows = exportBoardRows(req.params.id) || [];

    const header = [
      'column',
      'card_content',
      'card_author',
      'card_created_at',
      'comment_content',
      'comment_author',
      'comment_created_at',
    ];
    const csv = [header.join(',')];
    for (const row of rows) {
      csv.push(
        [
          row.column_title,
          row.card_content,
          row.card_author,
          row.card_created_at ? new Date(row.card_created_at).toISOString() : '',
          row.comment_content,
          row.comment_author,
          row.comment_created_at
            ? new Date(row.comment_created_at).toISOString()
            : '',
        ]
          .map(csvCell)
          .join(','),
      );
    }
    const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 50);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeTitle || 'board'}.csv"`,
    );
    res.send(csv.join('\n'));
  });

  return router;
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
