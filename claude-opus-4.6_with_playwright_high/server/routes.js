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
  const board = queries.getBoardFull(req.params.id);
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
  const board = queries.getBoard(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  const column = queries.createColumn(req.params.id, title.trim());
  res.status(201).json(column);
});

// 7.1 Export board to CSV
router.get('/boards/:id/export', (req, res) => {
  const board = queries.getBoardFull(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const rows = [['Column', 'Card', 'Author', 'Created At', 'Comment', 'Comment Author']];

  for (const col of board.columns) {
    for (const card of col.cards) {
      if (card.comments && card.comments.length > 0) {
        for (const comment of card.comments) {
          rows.push([col.title, card.content, card.author_name, card.created_at, comment.content, comment.author_name]);
        }
      } else {
        rows.push([col.title, card.content, card.author_name, card.created_at, '', '']);
      }
    }
  }

  function escapeCsv(val) {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${board.title}.csv"`);
  res.send(csv);
});

module.exports = router;
