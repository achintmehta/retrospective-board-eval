const express = require('express');
const {
  createBoard,
  listBoards,
  getBoardById,
  createColumn,
} = require('./db');

const router = express.Router();

router.get('/boards', (req, res) => {
  res.json(listBoards());
});

router.post('/boards', (req, res) => {
  const title = (req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const board = createBoard(title);
  res.status(201).json(board);
});

router.get('/boards/:id', (req, res) => {
  const board = getBoardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(board);
});

router.post('/boards/:id/columns', (req, res) => {
  const title = (req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const column = createColumn(req.params.id, title);
  if (!column) return res.status(404).json({ error: 'board not found' });
  res.status(201).json(column);
});

router.get('/boards/:id/export', (req, res) => {
  const board = getBoardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });

  const csvEscape = (val) => {
    const s = String(val ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const rows = [['Column', 'Card Content', 'Card Author', 'Card Created At', 'Comment Author', 'Comment Content', 'Comment Created At']];
  for (const column of board.columns) {
    if (column.cards.length === 0) {
      rows.push([column.title, '', '', '', '', '', '']);
      continue;
    }
    for (const card of column.cards) {
      if (card.comments.length === 0) {
        rows.push([
          column.title,
          card.content,
          card.authorName,
          new Date(card.createdAt).toISOString(),
          '',
          '',
          '',
        ]);
      } else {
        for (const comment of card.comments) {
          rows.push([
            column.title,
            card.content,
            card.authorName,
            new Date(card.createdAt).toISOString(),
            comment.authorName,
            comment.content,
            new Date(comment.createdAt).toISOString(),
          ]);
        }
      }
    }
  }

  const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
  const safeTitle = board.title.replace(/[^a-z0-9\-_]+/gi, '_').slice(0, 50) || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeTitle}_${board.id}.csv"`
  );
  res.send(csv);
});

module.exports = router;
