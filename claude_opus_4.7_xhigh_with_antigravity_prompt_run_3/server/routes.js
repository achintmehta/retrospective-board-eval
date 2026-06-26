import { Router } from 'express';
import { nanoid } from 'nanoid';
import { boardsRepo, columnsRepo, exportBoardRows } from './db.js';

const router = Router();

const MAX_BOARD_TITLE = 120;
const MAX_COLUMN_TITLE = 60;

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function trim(val, max) {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

router.get('/boards', (req, res) => {
  res.json(boardsRepo.list());
});

router.post('/boards', (req, res) => {
  const title = trim(req.body?.title, MAX_BOARD_TITLE);
  if (!title) return badRequest(res, `Board title is required (max ${MAX_BOARD_TITLE} chars).`);

  let columns = [];
  if (Array.isArray(req.body?.columns)) {
    for (const col of req.body.columns) {
      const t = trim(col?.title, MAX_COLUMN_TITLE);
      if (!t) return badRequest(res, `Each column needs a title (max ${MAX_COLUMN_TITLE} chars).`);
      columns.push({ title: t });
    }
  }
  if (columns.length === 0) {
    columns = [
      { title: 'Went Well' },
      { title: 'Needs Improvement' },
      { title: 'Action Items' },
    ];
  }

  const id = nanoid(10);
  const board = boardsRepo.create({ id, title, columns });
  res.status(201).json(board);
});

router.get('/boards/:id', (req, res) => {
  const payload = boardsRepo.get(req.params.id);
  if (!payload) return res.status(404).json({ error: 'Board not found' });
  res.json(payload);
});

router.post('/boards/:id/columns', (req, res) => {
  if (!boardsRepo.exists(req.params.id)) return res.status(404).json({ error: 'Board not found' });
  const title = trim(req.body?.title, MAX_COLUMN_TITLE);
  if (!title) return badRequest(res, `Column title is required (max ${MAX_COLUMN_TITLE} chars).`);
  const column = columnsRepo.create({ board_id: req.params.id, title });
  // Broadcast over websocket so currently-viewing clients see the new column.
  const io = req.app.get('io');
  if (io) io.to(`board:${req.params.id}`).emit('column_added', column);
  res.status(201).json(column);
});

// --- CSV Export ---
router.get('/boards/:id/export', (req, res) => {
  const rows = exportBoardRows(req.params.id);
  if (rows.length === 0 && !boardsRepo.exists(req.params.id)) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const headers = ['column', 'card_position', 'card_author', 'card_content', 'card_created_at', 'comment_author', 'comment_content', 'comment_created_at'];
  const csvRows = [headers.join(',')];
  for (const row of rows) {
    if (row.card_id == null) {
      csvRows.push([row.column_title, '', '', '', '', '', '', ''].map(csvEscape).join(','));
      continue;
    }
    csvRows.push([
      row.column_title,
      row.card_position + 1,
      row.card_author,
      row.card_content,
      row.card_created_at,
      row.comment_author || '',
      row.comment_content || '',
      row.comment_created_at || '',
    ].map(csvEscape).join(','));
  }
  const csv = csvRows.join('\r\n');

  const safeName = (rows[0]?.board_title || 'board')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'board';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="retro-${safeName}.csv"`);
  // BOM so Excel auto-detects UTF-8 correctly
  res.write('﻿');
  res.end(csv);
});

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default router;
