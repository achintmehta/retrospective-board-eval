const express = require('express');
const {
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  getColumnCountInBoard
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
    const boardId = req.params.id;
    const board = getBoardById(db, boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    const position = getColumnCountInBoard(db, boardId);
    const column = createColumn(db, boardId, title.trim(), position);
    res.status(201).json(column);
  });

  return router;
};
