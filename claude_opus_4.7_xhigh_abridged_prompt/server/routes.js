import { Router } from 'express';
import * as repo from './repo.js';
import { boardCsv } from './csv.js';

export function createRouter(io) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  // ---- Boards --------------------------------------------------------------
  router.get('/boards', (_req, res) => {
    res.json({ boards: repo.listBoards() });
  });

  router.post('/boards', (req, res) => {
    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (title.length > 120)
      return res.status(400).json({ error: 'Title must be 120 characters or fewer' });
    const board = repo.createBoard(title);
    res.status(201).json({ board });
  });

  router.get('/boards/:id', (req, res) => {
    const board = repo.getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json({ board });
  });

  // ---- Columns -------------------------------------------------------------
  router.post('/boards/:id/columns', (req, res) => {
    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Column title is required' });
    if (title.length > 60)
      return res.status(400).json({ error: 'Column title must be 60 characters or fewer' });
    const column = repo.addColumn(req.params.id, title);
    if (!column) return res.status(404).json({ error: 'Board not found' });
    io?.to(`board:${req.params.id}`).emit('column_added', { column });
    res.status(201).json({ column });
  });

  // ---- CSV Export ----------------------------------------------------------
  router.get('/boards/:id/export', (req, res) => {
    const data = repo.exportBoardRows(req.params.id);
    if (!data) return res.status(404).json({ error: 'Board not found' });
    const csv = boardCsv(data);
    const safeTitle = data.board.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'board';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeTitle}-retro.csv"`,
    );
    res.status(200).send(csv);
  });

  return router;
}
