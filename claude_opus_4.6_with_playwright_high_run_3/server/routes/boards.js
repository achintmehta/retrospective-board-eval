const express = require('express');
const {
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  getBoardForExport
} = require('../db');

module.exports = function (db) {
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
    const board = getBoardById(db, req.params.id);
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
    const column = createColumn(db, req.params.id, title.trim());
    res.status(201).json(column);
  });

  router.get('/:id/export', (req, res) => {
    const data = getBoardForExport(db, req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const { board, rows } = data;
    const headers = ['Column', 'Card Content', 'Card Author', 'Created At', 'Comments'];

    const escapeCsv = (val) => {
      const str = String(val || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [headers.join(',')];
    for (const row of rows) {
      csvLines.push([
        escapeCsv(row.column),
        escapeCsv(row.card_content),
        escapeCsv(row.card_author),
        escapeCsv(row.card_created),
        escapeCsv(row.comments)
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${board.title}.csv"`);
    res.send(csvLines.join('\n'));
  });

  return router;
};
