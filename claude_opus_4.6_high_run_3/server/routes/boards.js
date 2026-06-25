const express = require('express');
const {
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  getBoardForExport
} = require('../db');

function boardRoutes(db) {
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
    const column = createColumn(db, Number(req.params.id), title.trim());
    res.status(201).json(column);
  });

  router.get('/:id/export', (req, res) => {
    const data = getBoardForExport(db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const { board, rows } = data;

    const escCsv = (val) => {
      if (val == null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    let csv = 'Column,Card Content,Card Author,Card Created At,Comment,Comment Author,Comment Created At\n';
    for (const row of rows) {
      csv += [
        escCsv(row.column_title),
        escCsv(row.card_content),
        escCsv(row.card_author),
        escCsv(row.card_created_at),
        escCsv(row.comment_content),
        escCsv(row.comment_author),
        escCsv(row.comment_created_at)
      ].join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${board.title}.csv"`);
    res.send(csv);
  });

  return router;
}

module.exports = boardRoutes;
