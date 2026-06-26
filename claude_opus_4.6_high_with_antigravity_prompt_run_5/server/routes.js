const express = require('express');
const router = express.Router();
const {
  createBoard,
  getAllBoards,
  getFullBoard,
  createColumn,
  getMaxColumnPosition,
  getAllCardsForBoard,
  getBoardById,
} = require('./db');

router.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const result = createBoard.run(title.trim());
  const board = getFullBoard(result.lastInsertRowid);
  res.status(201).json(board);
});

router.get('/api/boards', (req, res) => {
  const boards = getAllBoards.all();
  res.json(boards);
});

router.get('/api/boards/:id', (req, res) => {
  const board = getFullBoard(Number(req.params.id));
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  res.json(board);
});

router.post('/api/boards/:id/columns', (req, res) => {
  const boardId = Number(req.params.id);
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }
  const board = getBoardById.get(boardId);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  const { max_pos } = getMaxColumnPosition.get(boardId);
  const result = createColumn.run(boardId, title.trim(), max_pos + 1);
  res.status(201).json({
    id: result.lastInsertRowid,
    board_id: boardId,
    title: title.trim(),
    position: max_pos + 1,
    cards: [],
  });
});

router.get('/api/boards/:id/export', (req, res) => {
  const boardId = Number(req.params.id);
  const board = getBoardById.get(boardId);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const cards = getAllCardsForBoard(boardId);

  const escapeCSV = (val) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  let csv = 'Column,Card Content,Author,Created At,Comments\n';
  for (const card of cards) {
    const commentsText = card.comments
      .map((c) => `${c.author_name}: ${c.content}`)
      .join(' | ');
    csv +=
      [
        escapeCSV(card.column_title),
        escapeCSV(card.content),
        escapeCSV(card.author_name),
        escapeCSV(card.created_at),
        escapeCSV(commentsText),
      ].join(',') + '\n';
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="board-${boardId}-export.csv"`
  );
  res.send(csv);
});

module.exports = router;
