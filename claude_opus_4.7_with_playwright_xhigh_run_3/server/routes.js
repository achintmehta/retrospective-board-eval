import { Router } from 'express';
import {
  createBoard,
  createColumn,
  getBoard,
  getBoardForExport,
  listBoards,
} from './db.js';

const router = Router();

router.get('/boards', (_req, res) => {
  res.json(listBoards());
});

router.post('/boards', (req, res) => {
  const title = (req.body?.title ?? '').toString().trim();
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  const board = createBoard(title);
  res.status(201).json(board);
});

router.get('/boards/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

router.post('/boards/:id/columns', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const title = (req.body?.title ?? '').toString().trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const column = createColumn(req.params.id, title);
  res.status(201).json(column);
});

router.get('/boards/:id/export', (req, res) => {
  const board = getBoardForExport(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const rows = [['Column', 'Card', 'Card Author', 'Card Created At', 'Comment', 'Comment Author', 'Comment Created At']];
  for (const col of board.columns) {
    if (col.cards.length === 0) {
      rows.push([col.title, '', '', '', '', '', '']);
      continue;
    }
    for (const card of col.cards) {
      if (card.comments.length === 0) {
        rows.push([col.title, card.content, card.author_name, card.created_at, '', '', '']);
      } else {
        for (const comment of card.comments) {
          rows.push([
            col.title,
            card.content,
            card.author_name,
            card.created_at,
            comment.content,
            comment.author_name,
            comment.created_at,
          ]);
        }
      }
    }
  }

  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n') + '\r\n';
  const safeTitle = board.title.replace(/[^a-z0-9_\-]+/gi, '_').toLowerCase() || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-${board.id}.csv"`);
  res.send(csv);
});

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export default router;
