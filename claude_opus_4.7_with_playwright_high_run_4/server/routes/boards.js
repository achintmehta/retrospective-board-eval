import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  getFullBoard,
  createColumn,
  listColumns
} from '../db.js';

const router = Router();

router.get('/boards', (req, res) => {
  res.json(listBoards());
});

router.post('/boards', (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const board = createBoard(title);
  res.status(201).json(board);
});

router.get('/boards/:id', (req, res) => {
  const board = getFullBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(board);
});

router.get('/boards/:id/columns', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(listColumns(req.params.id));
});

router.post('/boards/:id/columns', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const column = createColumn(req.params.id, title);
  res.status(201).json(column);
  // Notify connected clients on the board's room.
  const io = req.app.get('io');
  if (io) io.to(`board:${req.params.id}`).emit('column_added', column);
});

export default router;
