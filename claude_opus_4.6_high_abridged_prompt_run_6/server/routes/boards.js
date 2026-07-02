const express = require('express');
const { v4: uuidv4 } = require('uuid');
const {
  createBoard,
  getAllBoards,
  getFullBoard,
  createColumn,
  getColumnsByBoard,
  getDb,
} = require('../db');

const router = express.Router();

// POST /api/boards - Create a new board
router.post('/', (req, res) => {
  const { title, columns } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const boardId = uuidv4();
  const board = createBoard(boardId, title.trim());

  const defaultColumns = columns && columns.length > 0
    ? columns
    : ['Went Well', 'Needs Improvement', 'Action Items'];

  defaultColumns.forEach((colTitle, i) => {
    createColumn(uuidv4(), boardId, colTitle, i);
  });

  res.status(201).json(getFullBoard(boardId));
});

// GET /api/boards - Fetch all boards
router.get('/', (_req, res) => {
  const boards = getAllBoards();
  res.json(boards);
});

// GET /api/boards/:id - Fetch a specific board with columns, cards, comments
router.get('/:id', (req, res) => {
  const board = getFullBoard(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  res.json(board);
});

// POST /api/boards/:id/columns - Create a column for a board
router.post('/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }

  const existing = getColumnsByBoard(req.params.id);
  const position = existing.length;
  const colId = uuidv4();
  const column = createColumn(colId, req.params.id, title.trim(), position);
  res.status(201).json(column);
});

// GET /api/boards/:id/export - Export board as CSV
router.get('/:id/export', (req, res) => {
  const board = getFullBoard(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const rows = [['Column', 'Card', 'Author', 'Created At', 'Comment', 'Comment Author', 'Comment Date']];

  board.columns.forEach((col) => {
    if (col.cards.length === 0) {
      rows.push([col.title, '', '', '', '', '', '']);
    } else {
      col.cards.forEach((card) => {
        if (card.comments.length === 0) {
          rows.push([col.title, card.content, card.author_name, card.created_at, '', '', '']);
        } else {
          card.comments.forEach((comment) => {
            rows.push([
              col.title,
              card.content,
              card.author_name,
              card.created_at,
              comment.content,
              comment.author_name,
              comment.created_at,
            ]);
          });
        }
      });
    }
  });

  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${board.title.replace(/[^a-z0-9]/gi, '_')}_export.csv"`);
  res.send(csvContent);
});

module.exports = router;
