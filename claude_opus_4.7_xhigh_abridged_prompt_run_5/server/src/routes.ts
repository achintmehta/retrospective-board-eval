import { Router } from 'express';
import {
  createBoard,
  createColumn,
  getBoardDetail,
  listBoards,
  listColumns,
  listCardsForBoard,
  listCommentsForBoard,
} from './repository.js';

export const api = Router();

// POST /api/boards — create a new board (auto-seeds default columns)
api.post('/boards', (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 120) return res.status(400).json({ error: 'title too long' });
  const board = createBoard(title);
  res.status(201).json(board);
});

// GET /api/boards — list all boards
api.get('/boards', (_req, res) => {
  res.json(listBoards());
});

// GET /api/boards/:id — full board detail
api.get('/boards/:id', (req, res) => {
  const detail = getBoardDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: 'board not found' });
  res.json(detail);
});

// POST /api/boards/:id/columns — create a column
api.post('/boards/:id/columns', (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 60) return res.status(400).json({ error: 'title too long' });
  const column = createColumn(req.params.id, title);
  if (!column) return res.status(404).json({ error: 'board not found' });
  res.status(201).json(column);
});

// GET /api/boards/:id/columns — list columns for a board
api.get('/boards/:id/columns', (req, res) => {
  res.json(listColumns(req.params.id));
});

// GET /api/boards/:id/export — CSV export
api.get('/boards/:id/export', (req, res) => {
  const detail = getBoardDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: 'board not found' });

  const cards = listCardsForBoard(detail.id);
  const comments = listCommentsForBoard(detail.id);

  const columnById = new Map(detail.columns.map((c) => [c.id, c]));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const esc = (v: unknown) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const rows: string[] = [];
  rows.push(['type', 'column', 'card_content', 'card_author', 'comment_content', 'comment_author', 'created_at'].join(','));

  for (const card of cards) {
    const col = columnById.get(card.column_id);
    rows.push([
      'card',
      esc(col?.title ?? ''),
      esc(card.content),
      esc(card.author_name),
      '',
      '',
      new Date(card.created_at).toISOString(),
    ].join(','));
  }
  for (const cm of comments) {
    const card = cardById.get(cm.card_id);
    const col = card ? columnById.get(card.column_id) : undefined;
    rows.push([
      'comment',
      esc(col?.title ?? ''),
      esc(card?.content ?? ''),
      esc(card?.author_name ?? ''),
      esc(cm.content),
      esc(cm.author_name),
      new Date(cm.created_at).toISOString(),
    ].join(','));
  }

  const filename = `board-${detail.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${detail.id}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(rows.join('\r\n') + '\r\n');
});
