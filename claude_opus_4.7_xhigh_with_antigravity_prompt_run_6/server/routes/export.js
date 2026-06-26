import { Router } from 'express';
import { exportBoardRows } from '../repository.js';

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const fmtDate = (ts) => (ts ? new Date(ts).toISOString() : '');

const safeFilename = (title) =>
  (title || 'board')
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'board';

export function createExportRouter() {
  const router = Router();

  // 7.1 Export a board's data as CSV
  router.get('/boards/:id/export', (req, res) => {
    try {
      const data = exportBoardRows(req.params.id);
      if (!data) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }

      const { board, rows } = data;
      const header = [
        'column',
        'column_position',
        'card_content',
        'card_author',
        'card_position',
        'card_created_at',
        'comment_content',
        'comment_author',
        'comment_created_at'
      ];

      const lines = [header.map(csvEscape).join(',')];
      for (const row of rows) {
        lines.push(
          [
            row.column_title,
            row.column_position,
            row.card_content,
            row.card_author,
            row.card_position,
            fmtDate(row.card_created_at),
            row.comment_content,
            row.comment_author,
            fmtDate(row.comment_created_at)
          ]
            .map(csvEscape)
            .join(',')
        );
      }

      const csv = lines.join('\r\n') + '\r\n';
      const filename = `${safeFilename(board.title)}_${board.id.slice(0, 8)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
