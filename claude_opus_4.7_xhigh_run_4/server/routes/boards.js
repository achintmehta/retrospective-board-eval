import express from 'express';
import {
  createBoard,
  listBoards,
  getBoardFull,
  createColumn,
} from '../db.js';

export function buildBoardsRouter({ io } = {}) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(listBoards());
  });

  router.post('/', (req, res) => {
    const title = (req.body?.title ?? '').toString().trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (title.length > 200) return res.status(400).json({ error: 'title too long' });
    const board = createBoard(title);
    res.status(201).json(board);
  });

  router.get('/:id', (req, res) => {
    const board = getBoardFull(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  });

  router.post('/:id/columns', (req, res) => {
    const title = (req.body?.title ?? '').toString().trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (title.length > 100) return res.status(400).json({ error: 'title too long' });
    const column = createColumn(req.params.id, title);
    if (!column) return res.status(404).json({ error: 'Board not found' });
    if (io) {
      io.to(`board:${req.params.id}`).emit('column_added', {
        boardId: req.params.id,
        column,
      });
    }
    res.status(201).json(column);
  });

  return router;
}
