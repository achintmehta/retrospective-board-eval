const express = require('express');
const repo = require('../db/repository');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(repo.listBoards());
});

router.post('/', (req, res) => {
  const { title, columns } = req.body || {};
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const columnTitles = Array.isArray(columns) && columns.length
    ? columns.map((c) => String(c).trim()).filter(Boolean)
    : undefined;
  const board = repo.createBoard(title.trim(), columnTitles);
  res.status(201).json(board);
});

router.get('/:id', (req, res) => {
  const board = repo.getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(board);
});

router.post('/:id/columns', (req, res) => {
  const { title } = req.body || {};
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const board = repo.getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  const column = repo.createColumn(req.params.id, title.trim());

  const io = req.app.get('io');
  if (io) {
    io.to(`board:${req.params.id}`).emit('column_added', { ...column, cards: [] });
  }
  res.status(201).json(column);
});

module.exports = router;
