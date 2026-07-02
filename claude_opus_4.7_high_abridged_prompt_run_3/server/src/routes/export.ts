import { Router } from 'express';
import { getBoardWithChildren } from '../repository.js';

export const exportRouter = Router();

function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString();
}

exportRouter.get('/:id/export', (req, res) => {
  const board = getBoardWithChildren(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });

  const filename = `${board.title.replace(/[^\w\-]+/g, '_').slice(0, 60) || 'board'}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const header = [
    'board_title',
    'column',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ];
  res.write(header.map(csvEscape).join(',') + '\n');

  for (const col of board.columns) {
    if (col.cards.length === 0) {
      res.write(
        [board.title, col.title, '', '', '', '', '', '']
          .map(csvEscape)
          .join(',') + '\n'
      );
      continue;
    }
    for (const card of col.cards) {
      if (card.comments.length === 0) {
        res.write(
          [
            board.title,
            col.title,
            card.content,
            card.author_name,
            toIsoDate(card.created_at),
            '',
            '',
            '',
          ]
            .map(csvEscape)
            .join(',') + '\n'
        );
      } else {
        for (const comment of card.comments) {
          res.write(
            [
              board.title,
              col.title,
              card.content,
              card.author_name,
              toIsoDate(card.created_at),
              comment.content,
              comment.author_name,
              toIsoDate(comment.created_at),
            ]
              .map(csvEscape)
              .join(',') + '\n'
          );
        }
      }
    }
  }
  res.end();
});
