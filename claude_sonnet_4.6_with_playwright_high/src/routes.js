const express = require('express');
const { randomUUID } = require('crypto');
const db = require('./db');

const router = express.Router();

// POST /api/boards
router.post('/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Board title is required' });
  }
  const board = db.createBoard(randomUUID(), title.trim());
  res.status(201).json(board);
});

// GET /api/boards
router.get('/boards', (req, res) => {
  res.json(db.listBoards());
});

// GET /api/boards/:id
router.get('/boards/:id', (req, res) => {
  const board = db.getBoardFull(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

// POST /api/boards/:id/columns
router.post('/boards/:id/columns', (req, res) => {
  const board = db.getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }

  const position = db.getNextColumnPosition(req.params.id);
  const column = db.createColumn(randomUUID(), req.params.id, title.trim(), position);
  column.cards = [];
  res.status(201).json(column);
});

// GET /api/boards/:id/export
router.get('/boards/:id/export', (req, res) => {
  const board = db.getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const rows = db.getBoardExportData(req.params.id);

  const csvLines = [
    'Board Title,Column,Card Content,Card Author,Card Created At,Comment Content,Comment Author,Comment Created At'
  ];

  if (rows.length === 0) {
    // Export board info with empty data
    csvLines.push(`"${board.title}","","","","","","",""`);
  } else {
    for (const row of rows) {
      const escape = (v) => v ? `"${String(v).replace(/"/g, '""')}"` : '""';
      csvLines.push([
        escape(row.board_title),
        escape(row.column_title),
        escape(row.card_content),
        escape(row.card_author),
        escape(row.card_created_at),
        escape(row.comment_content),
        escape(row.comment_author),
        escape(row.comment_created_at),
      ].join(','));
    }
  }

  const filename = `retro-${board.title.replace(/[^a-z0-9]/gi, '_')}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvLines.join('\n'));
});

module.exports = router;
