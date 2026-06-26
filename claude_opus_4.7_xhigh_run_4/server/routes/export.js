import express from 'express';
import { getBoardExport } from '../db.js';

const CSV_COLUMNS = [
  { key: 'column', header: 'Column' },
  { key: 'card_content', header: 'Card Content' },
  { key: 'card_author', header: 'Card Author' },
  { key: 'card_created_at', header: 'Card Created At' },
  { key: 'comment_content', header: 'Comment Content' },
  { key: 'comment_author', header: 'Comment Author' },
  { key: 'comment_created_at', header: 'Comment Created At' },
];

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function safeFilename(title) {
  const cleaned = title.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'retro-board';
}

export function buildExportRouter() {
  const router = express.Router();

  router.get('/:id/export', (req, res) => {
    const data = getBoardExport(req.params.id);
    if (!data) return res.status(404).json({ error: 'Board not found' });

    const filename = `${safeFilename(data.board.title)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.write(CSV_COLUMNS.map((c) => escapeCsv(c.header)).join(',') + '\n');
    for (const row of data.rows) {
      res.write(CSV_COLUMNS.map((c) => escapeCsv(row[c.key])).join(',') + '\n');
    }
    res.end();
  });

  return router;
}
