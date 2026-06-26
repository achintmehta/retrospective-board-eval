import { Router } from 'express';
import { getBoard } from '../repository.js';

export const exportRouter = Router();

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(values) {
  return values.map(csvEscape).join(',');
}

exportRouter.get('/:id/export', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const rows = [
    toCsvRow(['type', 'column', 'card_author', 'card_content', 'comment_author', 'comment_content', 'created_at']),
  ];

  const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeTitle}-${board.id}.csv"`
  );

  board.columns.forEach((col) => {
    if (col.cards.length === 0) {
      rows.push(toCsvRow(['column', col.title, '', '', '', '', new Date(col.created_at).toISOString()]));
      return;
    }
    col.cards.forEach((card) => {
      rows.push(
        toCsvRow([
          'card',
          col.title,
          card.author_name,
          card.content,
          '',
          '',
          new Date(card.created_at).toISOString(),
        ])
      );
      card.comments.forEach((cm) => {
        rows.push(
          toCsvRow([
            'comment',
            col.title,
            card.author_name,
            card.content,
            cm.author_name,
            cm.content,
            new Date(cm.created_at).toISOString(),
          ])
        );
      });
    });
  });

  res.send(rows.join('\r\n') + '\r\n');
});
