import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
  getBoardExportRows,
} from './db.js';

export function createApiRouter() {
  const router = Router();

  // List all boards
  router.get('/boards', (_req, res) => {
    res.json(listBoards());
  });

  // Create a board
  router.post('/boards', (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    const board = createBoard(title);
    res.status(201).json(board);
  });

  // Get a specific board with columns, cards, comments
  router.get('/boards/:id', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  });

  // Create a column in a board
  router.post('/boards/:id/columns', (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    const column = createColumn(req.params.id, title);
    if (!column) return res.status(404).json({ error: 'board not found' });
    res.status(201).json(column);
  });

  // Export a board as CSV
  router.get('/boards/:id/export', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    const rows = getBoardExportRows(req.params.id);
    const csv = rowsToCsv(rows);
    const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="retro-${safeTitle || 'board'}.csv"`
    );
    res.send(csv);
  });

  return router;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function rowsToCsv(rows) {
  const header = [
    'column_position',
    'column_title',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.column_position,
        r.column_title,
        r.card_content,
        r.card_author,
        r.card_created_at ? new Date(r.card_created_at).toISOString() : '',
        r.comment_content,
        r.comment_author,
        r.comment_created_at ? new Date(r.comment_created_at).toISOString() : '',
      ]
        .map(csvEscape)
        .join(',')
    );
  }
  return lines.join('\n') + '\n';
}
