import { Router, type Request, type Response } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
  exportBoardRows,
} from './db.js';

export const api = Router();

api.get('/boards', (_req: Request, res: Response) => {
  res.json(listBoards());
});

api.post('/boards', (req: Request, res: Response) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 120)
    return res.status(400).json({ error: 'title too long (max 120)' });
  const board = createBoard(title);
  res.status(201).json(board);
});

api.get('/boards/:id', (req: Request, res: Response) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });
  res.json(board);
});

api.post('/boards/:id/columns', (req: Request, res: Response) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 60)
    return res.status(400).json({ error: 'title too long (max 60)' });
  const column = createColumn(req.params.id, title);
  if (!column) return res.status(404).json({ error: 'board not found' });
  res.status(201).json(column);
});

function csvEscape(value: string): string {
  if (value == null) return '';
  const needsQuoting = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

api.get('/boards/:id/export', (req: Request, res: Response) => {
  const result = exportBoardRows(req.params.id);
  if (!result) return res.status(404).json({ error: 'board not found' });

  const { board, rows } = result;
  const headers = [
    'Column',
    'Card',
    'Card Author',
    'Card Created At',
    'Comment',
    'Comment Author',
    'Comment Created At',
  ];

  const lines: string[] = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.column,
        row.card,
        row.author,
        row.createdAt,
        row.comment,
        row.commentAuthor,
        row.commentCreatedAt,
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60);
  const filename = `retro_${safeTitle || board.id}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + lines.join('\r\n'));
});
