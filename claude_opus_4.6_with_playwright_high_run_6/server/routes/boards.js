const express = require('express');
const router = express.Router();
const {
  createBoard,
  getAllBoards,
  getBoard,
  createColumn,
  getBoardForExport,
} = require('../queries');

router.post('/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const board = createBoard(title.trim());
  res.status(201).json(board);
});

router.get('/boards', (req, res) => {
  const boards = getAllBoards();
  res.json(boards);
});

router.get('/boards/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  res.json(board);
});

router.post('/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }
  const board = getBoard(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  const column = createColumn(req.params.id, title.trim());
  res.status(201).json(column);
});

router.get('/boards/:id/export', (req, res) => {
  const data = getBoardForExport(req.params.id);
  if (!data) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const escape = (val) => {
    if (val == null) return '';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const header = 'Column,Card Content,Card Author,Card Created At,Comment,Comment Author,Comment Created At';
  const lines = [header];

  for (const row of data.rows) {
    lines.push([
      escape(row.column_title),
      escape(row.card_content),
      escape(row.card_author),
      escape(row.card_created_at),
      escape(row.comment_content),
      escape(row.comment_author),
      escape(row.comment_created_at),
    ].join(','));
  }

  const csv = lines.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${data.board.title}.csv"`);
  res.send(csv);
});

module.exports = router;
