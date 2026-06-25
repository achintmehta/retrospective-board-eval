const express = require('express');
const {
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
} = require('./db');

module.exports = function apiRoutes(db) {
  const router = express.Router();

  router.post('/boards', (req, res) => {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const board = createBoard(db, title.trim());
    res.status(201).json(board);
  });

  router.get('/boards', (req, res) => {
    const boards = getAllBoards(db);
    res.json(boards);
  });

  router.get('/boards/:id', (req, res) => {
    const board = getBoardById(db, req.params.id);
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
    const board = getBoardById(db, req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    const column = createColumn(db, req.params.id, title.trim());
    res.status(201).json(column);
  });

  router.get('/boards/:id/export', (req, res) => {
    const board = getBoardById(db, req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const rows = [];
    rows.push(['Column', 'Card', 'Author', 'Created At', 'Comment', 'Comment Author', 'Comment Date'].join(','));

    for (const col of board.columns) {
      for (const card of col.cards) {
        const escapeCsv = (str) => `"${String(str).replace(/"/g, '""')}"`;
        if (card.comments.length === 0) {
          rows.push([
            escapeCsv(col.title),
            escapeCsv(card.content),
            escapeCsv(card.author_name),
            escapeCsv(card.created_at),
            '',
            '',
            '',
          ].join(','));
        } else {
          for (const comment of card.comments) {
            rows.push([
              escapeCsv(col.title),
              escapeCsv(card.content),
              escapeCsv(card.author_name),
              escapeCsv(card.created_at),
              escapeCsv(comment.content),
              escapeCsv(comment.author_name),
              escapeCsv(comment.created_at),
            ].join(','));
          }
        }
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="board-${board.id}.csv"`);
    res.send(rows.join('\n'));
  });

  return router;
};
