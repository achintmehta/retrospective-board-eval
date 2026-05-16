import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoardWithChildren,
  getBoardSummary,
  createColumn,
} from '../db/repository.js';

export const boardsRouter = Router();

// POST /api/boards — create a new board.
boardsRouter.post('/', async (req, res, next) => {
  try {
    const title = (req.body?.title ?? '').trim();
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    const board = await createBoard(title);
    res.status(201).json(board);
  } catch (err) {
    next(err);
  }
});

// GET /api/boards — list all boards (newest first).
boardsRouter.get('/', async (_req, res, next) => {
  try {
    const boards = await listBoards();
    res.json(boards);
  } catch (err) {
    next(err);
  }
});

// GET /api/boards/:id — fetch a board with columns, cards, and comments.
boardsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'invalid board id' });
    }
    const board = await getBoardWithChildren(id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  } catch (err) {
    next(err);
  }
});

// POST /api/boards/:id/columns — add a column to a board.
boardsRouter.post('/:id/columns', async (req, res, next) => {
  try {
    const boardId = Number(req.params.id);
    if (!Number.isInteger(boardId)) {
      return res.status(400).json({ error: 'invalid board id' });
    }
    const title = (req.body?.title ?? '').trim();
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    const board = await getBoardSummary(boardId);
    if (!board) return res.status(404).json({ error: 'board not found' });

    const column = await createColumn(boardId, title);
    res.status(201).json(column);
  } catch (err) {
    next(err);
  }
});
