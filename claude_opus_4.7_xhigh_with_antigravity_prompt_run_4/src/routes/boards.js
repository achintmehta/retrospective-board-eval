import express from 'express';
import {
  createBoard,
  listBoards,
  getFullBoard,
  createColumn,
  ValidationError,
  NotFoundError,
} from '../repository.js';
import { buildBoardCsv } from '../csv.js';

const router = express.Router();

function handleError(err, res) {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  console.error('[boards] unexpected error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}

router.post('/', (req, res) => {
  try {
    const board = createBoard({ title: req.body?.title });
    res.status(201).json(board);
  } catch (err) {
    handleError(err, res);
  }
});

router.get('/', (_req, res) => {
  try {
    const boards = listBoards();
    res.json(boards);
  } catch (err) {
    handleError(err, res);
  }
});

router.get('/:id', (req, res) => {
  try {
    const board = getFullBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  } catch (err) {
    handleError(err, res);
  }
});

router.post('/:id/columns', (req, res) => {
  try {
    const column = createColumn(req.params.id, { title: req.body?.title });
    // Note: we also broadcast over Socket.io in the socket layer, but the REST
    // endpoint is the canonical "create" path for columns.
    if (req.app.locals.io) {
      req.app.locals.io.to(`board:${req.params.id}`).emit('column_added', column);
    }
    res.status(201).json(column);
  } catch (err) {
    handleError(err, res);
  }
});

router.get('/:id/export', (req, res) => {
  try {
    const board = getFullBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    const csv = buildBoardCsv(board);
    const safeTitle = (board.title || 'board').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60);
    const filename = `retro-${safeTitle}-${board.id}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM helps Excel recognize UTF-8
    res.write('﻿');
    res.end(csv);
  } catch (err) {
    handleError(err, res);
  }
});

export default router;
