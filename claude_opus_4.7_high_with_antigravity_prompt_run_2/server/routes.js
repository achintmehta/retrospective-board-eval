const express = require('express');
const {
  createBoard,
  listBoards,
  getFullBoard,
  createColumn,
} = require('./store');
const { buildBoardCsv } = require('./csv');

function buildRouter() {
  const router = express.Router();

  // POST /api/boards - create a board
  router.post('/boards', (req, res) => {
    const { title } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const board = createBoard(title);
    res.status(201).json(board);
  });

  // GET /api/boards - list boards
  router.get('/boards', (_req, res) => {
    res.json(listBoards());
  });

  // GET /api/boards/:id - full board with columns/cards/comments
  router.get('/boards/:id', (req, res) => {
    const board = getFullBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  });

  // POST /api/boards/:id/columns - add a column
  router.post('/boards/:id/columns', (req, res) => {
    const { title } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const column = createColumn(req.params.id, title);
    if (!column) return res.status(404).json({ error: 'board not found' });
    res.status(201).json(column);
  });

  // GET /api/boards/:id/export - stream CSV
  router.get('/boards/:id/export', (req, res) => {
    const board = getFullBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });

    const filename = `${slugify(board.title) || 'retro-board'}-${board.id}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(buildBoardCsv(board));
  });

  return router;
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

module.exports = { buildRouter };
