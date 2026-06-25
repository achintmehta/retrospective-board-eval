const express = require('express');
const {
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  getBoardForExport,
} = require('../db');

module.exports = function boardRoutes(db, io) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const board = createBoard(db, title.trim());
    res.status(201).json(board);
  });

  router.get('/', (req, res) => {
    const boards = getAllBoards(db);
    res.json(boards);
  });

  router.get('/:id', (req, res) => {
    const board = getBoardById(db, Number(req.params.id));
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    res.json(board);
  });

  router.post('/:id/columns', (req, res) => {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Column title is required' });
    }
    const boardId = Number(req.params.id);
    const column = createColumn(db, boardId, title.trim());
    io.to(`board:${boardId}`).emit('column_added', { column });
    res.status(201).json(column);
  });

  router.get('/:id/export', (req, res) => {
    const data = getBoardForExport(db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const { board, rows } = data;
    const csvHeader = 'Column,Card Content,Card Author,Created At,Comments\n';
    const csvRows = rows.map(r => {
      const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;
      return [
        escape(r.column),
        escape(r.cardContent),
        escape(r.cardAuthor),
        escape(r.cardCreatedAt),
        escape(r.comments),
      ].join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${board.title}-export.csv"`);
    res.send(csvHeader + csvRows);
  });

  return router;
};
