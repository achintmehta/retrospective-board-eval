import { Router } from 'express';
import { repo } from './db.js';

const router = Router();

router.post('/boards', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ error: 'title is required' });
  const board = repo.createBoard({ title });
  res.status(201).json(board);
});

router.get('/boards', (_req, res) => {
  res.json(repo.listBoards());
});

router.get('/boards/:id', (req, res) => {
  const board = repo.getBoardWithContents(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(board);
});

router.post('/boards/:id/columns', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ error: 'title is required' });
  const column = repo.createColumn({ boardId: req.params.id, title });
  if (!column) return res.status(404).json({ error: 'board not found' });
  res.status(201).json(column);
});

export default router;
