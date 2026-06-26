import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
} from '../repository.js';

export const boardsRouter = Router();

boardsRouter.get('/', (req, res) => {
  res.json(listBoards());
});

boardsRouter.post('/', (req, res) => {
  try {
    const board = createBoard(req.body?.title);
    res.status(201).json(board);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

boardsRouter.get('/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

boardsRouter.post('/:id/columns', (req, res) => {
  try {
    const column = createColumn(req.params.id, req.body?.title);
    const io = req.app.get('io');
    if (io) io.to(`board:${req.params.id}`).emit('column_added', column);
    res.status(201).json(column);
  } catch (err) {
    const code = err.message === 'Board not found' ? 404 : 400;
    res.status(code).json({ error: err.message });
  }
});
