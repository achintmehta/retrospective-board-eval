import { Router } from 'express';
import { getBoardForExport } from '../db/repository.js';

export const exportRouter = Router();

// CSV escaping per RFC 4180: wrap fields in quotes and double up internal quotes.
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values) {
  return values.map(csvEscape).join(',') + '\r\n';
}

// GET /api/boards/:id/export
// Streams a CSV with one row per card and one row per comment, sharing a column
// schema so the file is easy to load into a spreadsheet.
exportRouter.get('/:id/export', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'invalid board id' });
    }
    const board = await getBoardForExport(id);
    if (!board) return res.status(404).json({ error: 'board not found' });

    const filename = `board-${id}-${board.title.replace(/[^a-z0-9-_]+/gi, '_')}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    res.write(
      toCsvRow([
        'type',
        'column',
        'card_content',
        'comment_content',
        'author',
        'created_at',
      ])
    );

    for (const column of board.columns) {
      for (const card of column.cards) {
        res.write(
          toCsvRow([
            'card',
            column.title,
            card.content,
            '',
            card.author_name,
            card.created_at,
          ])
        );
        for (const comment of card.comments) {
          res.write(
            toCsvRow([
              'comment',
              column.title,
              card.content,
              comment.content,
              comment.author_name,
              comment.created_at,
            ])
          );
        }
      }
    }

    res.end();
  } catch (err) {
    next(err);
  }
});
