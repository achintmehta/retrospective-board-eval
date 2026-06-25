const express = require('express');
const queries = require('./queries');

const router = express.Router();

// 3.1 Create a new board
router.post('/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const board = queries.createBoard(title.trim());
  res.status(201).json(board);
});

// 3.2 Fetch all boards
router.get('/boards', (req, res) => {
  const boards = queries.getAllBoards();
  res.json(boards);
});

// 3.3 Fetch a specific board with columns, cards, and comments
router.get('/boards/:id', (req, res) => {
  const board = queries.getBoardWithDetails(Number(req.params.id));
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  res.json(board);
});

// 3.4 Create board columns
router.post('/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }
  const board = queries.getBoardById(Number(req.params.id));
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  const column = queries.createColumn(Number(req.params.id), title.trim());
  res.status(201).json(column);
});

// 7.1 Export board to CSV
router.get('/boards/:id/export', (req, res) => {
  const data = queries.getBoardExportData(Number(req.params.id));
  if (!data) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const { board, rows } = data;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${board.title}.csv"`);

  const header = 'Column,Card Content,Card Author,Card Created At,Comment,Comment Author,Comment Created At\n';
  res.write(header);

  for (const row of rows) {
    const fields = [
      row.column_title,
      row.card_content,
      row.card_author,
      row.card_created_at,
      row.comment_content,
      row.comment_author,
      row.comment_created_at,
    ].map(val => {
      if (val == null) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    res.write(fields.join(',') + '\n');
  }

  res.end();
});

module.exports = router;
