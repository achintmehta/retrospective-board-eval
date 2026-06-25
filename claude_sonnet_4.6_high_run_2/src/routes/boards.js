const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');

const router = express.Router();

router.post('/', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const id = randomUUID();
  db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(id, title.trim());
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  res.status(201).json(board);
});

router.get('/', (req, res) => {
  const boards = db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
  res.json(boards);
});

router.get('/:id', (req, res) => {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const columns = db.prepare(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
  ).all(board.id);

  for (const col of columns) {
    const cards = db.prepare(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position, created_at'
    ).all(col.id);
    for (const card of cards) {
      card.comments = db.prepare(
        'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at'
      ).all(card.id);
    }
    col.cards = cards;
  }

  board.columns = columns;
  res.json(board);
});

router.post('/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const maxRow = db.prepare(
    'SELECT MAX(position) as pos FROM board_columns WHERE board_id = ?'
  ).get(req.params.id);
  const position = (maxRow.pos ?? -1) + 1;

  const id = randomUUID();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, req.params.id, title.trim(), position);

  const column = db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id);
  column.cards = [];
  res.status(201).json(column);
});

router.get('/:id/export', (req, res) => {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const columns = db.prepare(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
  ).all(board.id);

  const escape = (s) => String(s ?? '').replace(/"/g, '""');
  const rows = ['Column,Card Author,Card Content,Comment Author,Comment Content,Comment Date'];

  for (const col of columns) {
    const cards = db.prepare(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position, created_at'
    ).all(col.id);

    if (cards.length === 0) {
      rows.push(`"${escape(col.title)}","","","","",""`);
      continue;
    }

    for (const card of cards) {
      const comments = db.prepare(
        'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at'
      ).all(card.id);

      if (comments.length === 0) {
        rows.push(`"${escape(col.title)}","${escape(card.author_name)}","${escape(card.content)}","","",""`);
        continue;
      }

      for (const c of comments) {
        rows.push(
          `"${escape(col.title)}","${escape(card.author_name)}","${escape(card.content)}","${escape(c.author_name)}","${escape(c.content)}","${c.created_at}"`
        );
      }
    }
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="retro-${board.id}.csv"`);
  res.send(rows.join('\n'));
});

module.exports = router;
