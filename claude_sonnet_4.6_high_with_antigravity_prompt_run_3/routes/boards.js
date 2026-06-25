const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// POST /api/boards - create new board
router.post('/', (req, res) => {
  const { title, columns } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Board title is required' });
  }

  const boardId = uuidv4();
  const board = db.createBoard(boardId, title.trim());

  // Create default columns if provided, otherwise use defaults
  const columnTitles = Array.isArray(columns) && columns.length > 0
    ? columns
    : ['Went Well', 'Needs Improvement', 'Action Items'];

  const createdColumns = columnTitles.map((colTitle, index) => {
    const colId = uuidv4();
    return db.createColumn(colId, boardId, colTitle, index);
  });

  res.status(201).json({ ...board, columns: createdColumns });
});

// GET /api/boards - fetch all boards
router.get('/', (req, res) => {
  const boards = db.getAllBoards();
  res.json(boards);
});

// GET /api/boards/:id - fetch specific board with columns, cards, comments
router.get('/:id', (req, res) => {
  const board = db.getFullBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

// POST /api/boards/:id/columns - create a column
router.post('/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }

  const board = db.getBoardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const existingColumns = db.getColumnsByBoardId(req.params.id);
  const position = existingColumns.length;
  const colId = uuidv4();
  const column = db.createColumn(colId, req.params.id, title.trim(), position);
  res.status(201).json(column);
});

// GET /api/boards/:id/export - export board to CSV
router.get('/:id/export', (req, res) => {
  const rows = db.getBoardExportData(req.params.id);
  if (!rows) return res.status(404).json({ error: 'Board not found' });

  const board = db.getBoardById(req.params.id);
  const headers = [
    'board_title', 'column', 'card_id', 'card_content',
    'card_author', 'card_created_at', 'comment_id',
    'comment_content', 'comment_author', 'comment_created_at'
  ];

  const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
  const csvLines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(','))
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="retro-${board.id}.csv"`);
  res.send(csvLines.join('\n'));
});

module.exports = router;
