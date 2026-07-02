import { Router, type Request, type Response } from 'express';
import {
  addCard,
  addComment,
  createBoard,
  createColumn,
  getBoard,
  listBoards,
} from './repository.js';
import { boardToCsv } from './csv.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true, time: Date.now() });
});

apiRouter.get('/boards', (_req, res) => {
  res.json(listBoards());
});

apiRouter.post('/boards', (req: Request, res: Response) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 120)
    return res.status(400).json({ error: 'title too long (max 120 chars)' });
  const board = createBoard(title);
  res.status(201).json(board);
});

apiRouter.get('/boards/:id', (req: Request, res: Response) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(board);
});

apiRouter.post('/boards/:id/columns', (req: Request, res: Response) => {
  const title = String(req.body?.title ?? '').trim();
  const accent = String(req.body?.accent ?? 'violet').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const column = createColumn(req.params.id, title, accent);
  if (!column) return res.status(404).json({ error: 'board not found' });
  res.status(201).json(column);
});

apiRouter.get('/boards/:id/export', (req: Request, res: Response) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  const csv = boardToCsv(board);
  const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60) || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="retro-${safeTitle}-${board.id}.csv"`
  );
  res.send(csv);
});

// REST fallbacks so the API is usable without WebSockets
apiRouter.post('/columns/:id/cards', (req: Request, res: Response) => {
  const content = String(req.body?.content ?? '').trim();
  const author = String(req.body?.author_name ?? 'Anonymous').trim();
  if (!content) return res.status(400).json({ error: 'content is required' });
  const card = addCard(req.params.id, content, author);
  if (!card) return res.status(404).json({ error: 'column not found' });
  res.status(201).json(card);
});

apiRouter.post('/cards/:id/comments', (req: Request, res: Response) => {
  const content = String(req.body?.content ?? '').trim();
  const author = String(req.body?.author_name ?? 'Anonymous').trim();
  if (!content) return res.status(400).json({ error: 'content is required' });
  const comment = addComment(req.params.id, content, author);
  if (!comment) return res.status(404).json({ error: 'card not found' });
  res.status(201).json(comment);
});
