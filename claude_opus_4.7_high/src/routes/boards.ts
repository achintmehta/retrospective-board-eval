import { Router, type Request, type Response } from 'express';
import {
  createBoard,
  createColumn,
  exportBoardRows,
  getBoard,
  getBoardWithChildren,
  listBoards,
} from '../repository.js';

export const boardsRouter = Router();

boardsRouter.get('/boards', (_req: Request, res: Response) => {
  res.json(listBoards());
});

boardsRouter.post('/boards', (req: Request, res: Response) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const board = createBoard(title);
  res.status(201).json(board);
});

boardsRouter.get('/boards/:id', (req: Request, res: Response) => {
  const board = getBoardWithChildren(req.params.id);
  if (!board) {
    res.status(404).json({ error: 'board not found' });
    return;
  }
  res.json(board);
});

boardsRouter.post('/boards/:id/columns', (req: Request, res: Response) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const column = createColumn(req.params.id, title);
  if (!column) {
    res.status(404).json({ error: 'board not found' });
    return;
  }
  res.status(201).json(column);
});

function csvEscape(value: string): string {
  if (value === null || value === undefined) return '';
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

boardsRouter.get('/boards/:id/export', (req: Request, res: Response) => {
  const board = getBoard(req.params.id);
  if (!board) {
    res.status(404).json({ error: 'board not found' });
    return;
  }
  const rows = exportBoardRows(req.params.id);
  const safeName = board.title.replace(/[^A-Za-z0-9_-]+/g, '_') || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}.csv"`
  );

  const header = [
    'Column',
    'Card Content',
    'Card Author',
    'Card Created At',
    'Comment Content',
    'Comment Author',
    'Comment Created At',
  ].join(',');
  res.write(header + '\n');

  for (const row of rows) {
    const line = [
      csvEscape(row.column_title ?? ''),
      csvEscape(row.card_content ?? ''),
      csvEscape(row.card_author ?? ''),
      csvEscape(row.card_created_at ?? ''),
      csvEscape(row.comment_content ?? ''),
      csvEscape(row.comment_author ?? ''),
      csvEscape(row.comment_created_at ?? ''),
    ].join(',');
    res.write(line + '\n');
  }
  res.end();
});
