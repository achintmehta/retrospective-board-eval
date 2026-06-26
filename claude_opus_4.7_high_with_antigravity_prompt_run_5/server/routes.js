import { Router } from 'express';
import {
  listBoards,
  createBoard,
  getBoard,
  createColumn,
  exportBoardRows,
} from './repository.js';

export function buildRouter() {
  const router = Router();

  router.get('/health', (_req, res) => res.json({ ok: true }));

  // List all boards (newest first)
  router.get('/boards', (_req, res) => {
    res.json(listBoards());
  });

  // Create a board
  router.post('/boards', (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title required' });
    if (title.length > 120) return res.status(400).json({ error: 'title too long' });
    const board = createBoard(title);
    res.status(201).json(board);
  });

  // Get a specific board with columns/cards/comments
  router.get('/boards/:id', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  });

  // Add a column to a board
  router.post('/boards/:id/columns', (req, res) => {
    const title = (req.body?.title || '').trim();
    const color = (req.body?.color || 'violet').trim();
    if (!title) return res.status(400).json({ error: 'title required' });
    const col = createColumn(req.params.id, title, color);
    if (!col) return res.status(404).json({ error: 'board not found' });
    res.status(201).json(col);
  });

  // CSV export
  router.get('/boards/:id/export', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    const rows = exportBoardRows(req.params.id);

    const headers = [
      'board_title',
      'column_title',
      'card_content',
      'card_author',
      'card_created_at',
      'comment_content',
      'comment_author',
      'comment_created_at',
    ];

    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'number' ? new Date(v).toISOString() : String(v);
      if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.board_title,
          r.column_title,
          r.card_content,
          r.card_author,
          r.card_created_at,
          r.comment_content,
          r.comment_author,
          r.comment_created_at,
        ]
          .map(escape)
          .join(','),
      );
    }
    const csv = lines.join('\r\n') + '\r\n';

    const safeName = board.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60) || 'board';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}_${board.id}.csv"`,
    );
    res.send(csv);
  });

  return router;
}
