import { Router } from 'express';
import { repo } from './db.js';

const router = Router();

router.get('/boards/:id/export', (req, res) => {
  const board = repo.getBoardWithContents(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });

  const commentsByCard = new Map();
  for (const cm of board.comments) {
    if (!commentsByCard.has(cm.card_id)) commentsByCard.set(cm.card_id, []);
    commentsByCard.get(cm.card_id).push(cm);
  }

  const header = ['Column', 'Card', 'Author', 'Created At', 'Comment', 'Comment Author', 'Comment Created At'];
  const rows = [header];

  for (const col of board.columns) {
    const colCards = board.cards
      .filter((c) => c.column_id === col.id)
      .sort((a, b) => a.position - b.position || a.created_at - b.created_at);
    if (colCards.length === 0) {
      rows.push([col.title, '', '', '', '', '', '']);
      continue;
    }
    for (const card of colCards) {
      const comments = commentsByCard.get(card.id) ?? [];
      if (comments.length === 0) {
        rows.push([
          col.title,
          card.content,
          card.author_name,
          new Date(card.created_at).toISOString(),
          '',
          '',
          '',
        ]);
      } else {
        for (const cm of comments) {
          rows.push([
            col.title,
            card.content,
            card.author_name,
            new Date(card.created_at).toISOString(),
            cm.content,
            cm.author_name,
            new Date(cm.created_at).toISOString(),
          ]);
        }
      }
    }
  }
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 64) || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeTitle}-${board.id.slice(0, 8)}.csv"`
  );
  res.send(csv);
});

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export default router;
