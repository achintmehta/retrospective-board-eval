const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createBoard, getAllBoards, getFullBoard, createColumn, getColumnsByBoard } = require('../db');

const router = express.Router();

router.post('/', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const board = createBoard(uuidv4(), title.trim());
  res.status(201).json(board);
});

router.get('/', (req, res) => {
  const boards = getAllBoards();
  res.json(boards);
});

router.get('/:id', (req, res) => {
  const board = getFullBoard(req.params.id);
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
  const existing = getColumnsByBoard(req.params.id);
  const position = existing.length;
  const column = createColumn(uuidv4(), req.params.id, title.trim(), position);
  res.status(201).json(column);
});

module.exports = router;
