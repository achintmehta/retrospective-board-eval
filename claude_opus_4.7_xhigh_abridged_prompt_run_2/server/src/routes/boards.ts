import { Router } from 'express';
import type { Server as SocketServer } from 'socket.io';
import {
  createBoard,
  createColumn,
  getBoard,
  listBoards,
} from '../db/repo.js';
import { boardRoom, EVT } from '../realtime/events.js';
import { buildBoardCsv } from '../export/csv.js';

export function boardsRouter(io: SocketServer): Router {
  const router = Router();

  // POST /api/boards — create a new board (seeded with default columns)
  router.post('/', (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title : '';
    const board = createBoard(title);
    res.status(201).json(board);
  });

  // GET /api/boards — list all boards
  router.get('/', (_req, res) => {
    res.json(listBoards());
  });

  // GET /api/boards/:id — full board with columns, cards, comments
  router.get('/:id', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    res.json(board);
  });

  // POST /api/boards/:id/columns — add a column
  router.post('/:id/columns', (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title : '';
    if (!title.trim()) {
      return res.status(400).json({ error: 'Column title is required' });
    }
    const column = createColumn(req.params.id, title);
    if (!column) {
      return res.status(404).json({ error: 'Board not found' });
    }
    io.to(boardRoom(req.params.id)).emit(EVT.COLUMN_ADDED, column);
    res.status(201).json(column);
  });

  // GET /api/boards/:id/export — CSV export
  router.get('/:id/export', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    const csv = buildBoardCsv(board);
    const safeTitle = board.title
      .replace(/[^a-z0-9-_ ]/gi, '')
      .replace(/\s+/g, '_')
      .slice(0, 64) || 'retro-board';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeTitle}.csv"`
    );
    res.send(csv);
  });

  return router;
}
