const express = require('express');
const repo = require('./repository');
const { buildCsv } = require('./csv');

function createRouter(io) {
  const router = express.Router();

  // ---------- Boards ----------

  router.get('/boards', (req, res) => {
    res.json(repo.listBoards());
  });

  router.post('/boards', (req, res) => {
    const title = (req.body && req.body.title) ? String(req.body.title).trim() : '';
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    const board = repo.createBoard(title);
    res.status(201).json(board);
  });

  router.get('/boards/:id', (req, res) => {
    const board = repo.getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  });

  // ---------- Columns ----------

  router.post('/boards/:id/columns', (req, res) => {
    const title = (req.body && req.body.title) ? String(req.body.title).trim() : '';
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    const column = repo.addColumn(req.params.id, title);
    if (!column) return res.status(404).json({ error: 'board not found' });

    if (io) {
      io.to(`board:${req.params.id}`).emit('column_added', column);
    }
    res.status(201).json(column);
  });

  // ---------- Export ----------

  router.get('/boards/:id/export', (req, res) => {
    const board = repo.getBoardForExport(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });

    const csv = buildCsv(board);
    const safeName = board.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60) || 'board';
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
