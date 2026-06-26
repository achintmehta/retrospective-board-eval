const express = require('express');
const repo = require('./repository');
const { boardToCsv } = require('./csv');

function createRouter(broadcast) {
  const router = express.Router();

  // List boards
  router.get('/boards', (req, res) => {
    res.json(repo.listBoards());
  });

  // Create board
  router.post('/boards', (req, res) => {
    const title = (req.body && typeof req.body.title === 'string')
      ? req.body.title.trim()
      : '';
    if (!title) return res.status(400).json({ error: 'title is required' });
    const board = repo.createBoard(title);
    res.status(201).json(board);
  });

  // Get full board
  router.get('/boards/:id', (req, res) => {
    const board = repo.getFullBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  });

  // Create column on a board
  router.post('/boards/:id/columns', (req, res) => {
    const title = (req.body && typeof req.body.title === 'string')
      ? req.body.title.trim()
      : '';
    if (!title) return res.status(400).json({ error: 'title is required' });
    const column = repo.createColumn(req.params.id, title);
    if (!column) return res.status(404).json({ error: 'board not found' });
    if (broadcast) broadcast(req.params.id, 'column_added', column);
    res.status(201).json(column);
  });

  // Export board as CSV
  router.get('/boards/:id/export', (req, res) => {
    const board = repo.getBoardForExport(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    const csv = boardToCsv(board);
    const safeName = board.title.replace(/[^a-z0-9-_]+/gi, '_') || 'board';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}.csv"`
    );
    res.send(csv);
  });

  return router;
}

module.exports = { createRouter };
