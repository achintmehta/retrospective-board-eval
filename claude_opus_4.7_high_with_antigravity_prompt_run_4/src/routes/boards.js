const express = require('express');
const repo = require('../db/repository');
const { boardToCsv } = require('../utils/csv');

const router = express.Router();

router.post('/', (req, res) => {
  const title = (req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 120) return res.status(400).json({ error: 'title is too long' });
  const board = repo.createBoard(title);
  res.status(201).json(board);
});

router.get('/', (_req, res) => {
  res.json(repo.listBoards());
});

router.get('/:id', (req, res) => {
  const board = repo.getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(board);
});

router.post('/:id/columns', (req, res) => {
  const title = (req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 60) return res.status(400).json({ error: 'title is too long' });
  const column = repo.createColumn(req.params.id, title);
  if (!column) return res.status(404).json({ error: 'board not found' });

  const io = req.app.get('io');
  if (io) io.to(`board:${req.params.id}`).emit('column_added', column);

  res.status(201).json(column);
});

router.get('/:id/export', (req, res) => {
  const data = repo.getBoardExport(req.params.id);
  if (!data) return res.status(404).json({ error: 'board not found' });
  const csv = boardToCsv(data);
  const safeTitle = data.board.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40) || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.csv"`);
  res.send(csv);
});

module.exports = router;
