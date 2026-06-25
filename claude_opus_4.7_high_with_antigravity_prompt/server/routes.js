import express from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  addColumn,
  getBoardForExport
} from './db.js';

export function createRouter() {
  const router = express.Router();

  router.get('/boards', (req, res) => {
    res.json(listBoards());
  });

  router.post('/boards', (req, res) => {
    const title = (req.body?.title ?? '').toString().trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (title.length > 120) return res.status(400).json({ error: 'title is too long (max 120)' });
    const board = createBoard(title);
    res.status(201).json(board);
  });

  router.get('/boards/:id', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  });

  router.post('/boards/:id/columns', (req, res) => {
    const title = (req.body?.title ?? '').toString().trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (title.length > 60) return res.status(400).json({ error: 'title is too long (max 60)' });
    const column = addColumn(req.params.id, title);
    if (!column) return res.status(404).json({ error: 'board not found' });
    res.status(201).json(column);
  });

  router.get('/boards/:id/export', (req, res) => {
    const data = getBoardForExport(req.params.id);
    if (!data) return res.status(404).json({ error: 'board not found' });
    const csv = toCsv(data.rows);
    const safeTitle = data.board.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40) || 'board';
    const filename = `${safeTitle}-${data.board.id}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });

  return router;
}

const HEADERS = [
  'column',
  'card_content',
  'card_author',
  'card_created_at',
  'comment_content',
  'comment_author',
  'comment_created_at'
];

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows) {
  const lines = [HEADERS.join(',')];
  for (const row of rows) {
    lines.push(HEADERS.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\r\n');
}
