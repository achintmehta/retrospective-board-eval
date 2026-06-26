import { Router } from 'express';
import { getFullBoard } from '../db.js';

const router = Router();

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowToCsv(row) {
  return row.map(csvEscape).join(',');
}

router.get('/boards/:id/export', (req, res) => {
  const board = getFullBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });

  const rows = [];
  rows.push(rowToCsv(['type', 'column', 'card_author', 'card_content', 'comment_author', 'comment_content', 'created_at']));

  for (const col of board.columns) {
    for (const card of col.cards) {
      rows.push(
        rowToCsv([
          'card',
          col.title,
          card.author_name,
          card.content,
          '',
          '',
          new Date(card.created_at).toISOString()
        ])
      );
      for (const comment of card.comments) {
        rows.push(
          rowToCsv([
            'comment',
            col.title,
            card.author_name,
            card.content,
            comment.author_name,
            comment.content,
            new Date(comment.created_at).toISOString()
          ])
        );
      }
    }
  }

  const csv = rows.join('\r\n') + '\r\n';
  const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 64) || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeTitle}-${board.id}.csv"`
  );
  res.send(csv);
});

export default router;
