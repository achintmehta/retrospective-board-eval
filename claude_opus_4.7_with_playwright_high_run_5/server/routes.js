import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
  getBoardForExport,
} from './dao.js';

const router = Router();

function bad(res, code, message) {
  res.status(code).json({ error: message });
}

router.get('/boards', (req, res) => {
  res.json(listBoards());
});

router.post('/boards', (req, res) => {
  const { title, columnTitles } = req.body || {};
  if (typeof title !== 'string' || title.trim().length === 0) {
    return bad(res, 400, 'title is required');
  }
  const board = createBoard({
    title: title.trim(),
    columnTitles: Array.isArray(columnTitles)
      ? columnTitles.map((t) => String(t).trim()).filter(Boolean)
      : null,
  });
  res.status(201).json(board);
});

router.get('/boards/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return bad(res, 404, 'board not found');
  res.json(board);
});

router.post('/boards/:id/columns', (req, res) => {
  const { title } = req.body || {};
  if (typeof title !== 'string' || title.trim().length === 0) {
    return bad(res, 400, 'title is required');
  }
  const column = createColumn({ boardId: req.params.id, title: title.trim() });
  if (!column) return bad(res, 404, 'board not found');
  res.status(201).json(column);
});

router.get('/boards/:id/export', (req, res) => {
  const board = getBoardForExport(req.params.id);
  if (!board) return bad(res, 404, 'board not found');

  const filename = `${slugify(board.title)}-${board.id.slice(0, 8)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Header
  res.write(
    [
      'column',
      'card_content',
      'card_author',
      'card_created_at',
      'comment_content',
      'comment_author',
      'comment_created_at',
    ]
      .map(csvField)
      .join(',') + '\n'
  );

  for (const column of board.columns) {
    if (column.cards.length === 0) {
      res.write(
        [column.title, '', '', '', '', '', ''].map(csvField).join(',') + '\n'
      );
      continue;
    }
    for (const card of column.cards) {
      const cardCreated = new Date(card.createdAt).toISOString();
      if (card.comments.length === 0) {
        res.write(
          [
            column.title,
            card.content,
            card.authorName,
            cardCreated,
            '',
            '',
            '',
          ]
            .map(csvField)
            .join(',') + '\n'
        );
        continue;
      }
      for (const comment of card.comments) {
        res.write(
          [
            column.title,
            card.content,
            card.authorName,
            cardCreated,
            comment.content,
            comment.authorName,
            new Date(comment.createdAt).toISOString(),
          ]
            .map(csvField)
            .join(',') + '\n'
        );
      }
    }
  }

  res.end();
});

function csvField(value) {
  const s = value == null ? '' : String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function slugify(title) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'board'
  );
}

export default router;
