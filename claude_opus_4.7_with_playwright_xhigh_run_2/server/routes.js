const express = require('express');
const repo = require('./repository');

function asyncWrap(handler) {
  return (req, res, next) => {
    try {
      const out = handler(req, res, next);
      if (out && typeof out.then === 'function') {
        out.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}

function createApiRouter({ getIo } = {}) {
  const router = express.Router();

  // POST /api/boards — create a new board
  router.post(
    '/boards',
    asyncWrap((req, res) => {
      const { title, columns } = req.body || {};
      if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'title is required' });
      }
      const board = repo.createBoard({ title, columns });
      res.status(201).json(board);
    })
  );

  // GET /api/boards — list all boards
  router.get(
    '/boards',
    asyncWrap((_req, res) => {
      res.json(repo.listBoards());
    })
  );

  // GET /api/boards/:id — fetch a single board with columns/cards/comments
  router.get(
    '/boards/:id',
    asyncWrap((req, res) => {
      const board = repo.getBoardById(req.params.id);
      if (!board) {
        return res.status(404).json({ error: 'board not found' });
      }
      res.json(board);
    })
  );

  // POST /api/boards/:id/columns — add a column to a board
  router.post(
    '/boards/:id/columns',
    asyncWrap((req, res) => {
      const { title } = req.body || {};
      if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'title is required' });
      }
      try {
        const column = repo.addColumn({ boardId: req.params.id, title });
        const io = getIo && getIo();
        if (io) {
          io.to(`board:${req.params.id}`).emit('column_added', column);
        }
        res.status(201).json(column);
      } catch (err) {
        if (/Board not found/i.test(err.message)) {
          return res.status(404).json({ error: 'board not found' });
        }
        throw err;
      }
    })
  );

  // GET /api/boards/:id/export — CSV download
  router.get(
    '/boards/:id/export',
    asyncWrap((req, res) => {
      const result = repo.getBoardExportRows(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'board not found' });
      }
      const { board, rows } = result;
      const csv = renderCsv(board, rows);
      const filename = `${slugify(board.title) || 'board'}-${board.id.slice(0, 8)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('﻿' + csv);
    })
  );

  return router;
}

function csvEscape(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function renderCsv(_board, rows) {
  const headers = [
    'Column',
    'Card',
    'Card Author',
    'Card Created At',
    'Comment',
    'Comment Author',
    'Comment Created At',
  ];
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.column,
        row.card,
        row.cardAuthor,
        row.cardCreatedAt,
        row.comment,
        row.commentAuthor,
        row.commentCreatedAt,
      ]
        .map(csvEscape)
        .join(',')
    );
  }
  return lines.join('\r\n');
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

module.exports = { createApiRouter };
