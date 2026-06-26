const express = require('express');
const {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
} = require('./db');
const { buildBoardCsv } = require('./export');

const router = express.Router();

router.get('/boards', (req, res) => {
  res.json(listBoards());
});

router.post('/boards', (req, res) => {
  const title = (req.body?.title || '').toString().trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const board = createBoard(title);
  res.status(201).json(board);
});

router.get('/boards/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(board);
});

router.post('/boards/:id/columns', (req, res) => {
  const title = (req.body?.title || '').toString().trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const column = createColumn(req.params.id, title);
  if (!column) return res.status(404).json({ error: 'board not found' });
  res.status(201).json(column);
});

router.get('/boards/:id/export', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  const csv = buildBoardCsv(board);
  const safeTitle = board.title.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 50) || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeTitle}-${board.id}.csv"`
  );
  res.send(csv);
});

module.exports = router;
