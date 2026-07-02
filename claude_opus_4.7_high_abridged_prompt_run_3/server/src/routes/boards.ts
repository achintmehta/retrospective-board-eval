import { Router } from 'express';
import {
  createBoard,
  createColumn,
  getBoardWithChildren,
  listBoards,
} from '../repository.js';

export const boardsRouter = Router();

boardsRouter.get('/', (_req, res) => {
  res.json(listBoards());
});

boardsRouter.post('/', (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 120)
    return res.status(400).json({ error: 'title too long (max 120 chars)' });
  const board = createBoard(title);
  res.status(201).json(board);
});

boardsRouter.get('/:id', (req, res) => {
  const board = getBoardWithChildren(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(board);
});

boardsRouter.post('/:id/columns', (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 60)
    return res.status(400).json({ error: 'title too long (max 60 chars)' });
  const column = createColumn(req.params.id, title);
  if (!column) return res.status(404).json({ error: 'board not found' });
  res.status(201).json(column);
});
