import { Router } from 'express';
import * as repo from './repository.js';

export function apiRouter(io) {
  const router = Router();

  // Create board
  router.post('/boards', async (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title required' });
    if (title.length > 120) return res.status(400).json({ error: 'title too long' });
    try {
      const board = await repo.createBoard(title);
      res.status(201).json(board);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // List boards
  router.get('/boards', async (_req, res) => {
    try {
      const boards = await repo.listBoards();
      res.json(boards);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get board with columns/cards/comments
  router.get('/boards/:id', async (req, res) => {
    try {
      const board = await repo.getBoardFull(req.params.id);
      if (!board) return res.status(404).json({ error: 'board not found' });
      res.json(board);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create column on a board
  router.post('/boards/:id/columns', async (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title required' });
    if (title.length > 60) return res.status(400).json({ error: 'title too long' });
    try {
      const column = await repo.createColumn(req.params.id, title);
      if (!column) return res.status(404).json({ error: 'board not found' });
      // Broadcast to any connected room members
      io?.to(`board:${req.params.id}`).emit('column_added', column);
      res.status(201).json(column);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Export board to CSV
  router.get('/boards/:id/export', async (req, res) => {
    try {
      const board = await repo.getBoardFull(req.params.id);
      if (!board) return res.status(404).json({ error: 'board not found' });
      const csv = boardToCsv(board);
      const safeName = board.title.replace(/[^a-z0-9\-]+/gi, '_').toLowerCase();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="retro-${safeName || 'board'}.csv"`
      );
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function boardToCsv(board) {
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
  const rows = [header.join(',')];
  const commentsByCard = new Map();
  for (const c of board.comments) {
    if (!commentsByCard.has(c.card_id)) commentsByCard.set(c.card_id, []);
    commentsByCard.get(c.card_id).push(c);
  }
  const cardsByColumn = new Map();
  for (const c of board.cards) {
    if (!cardsByColumn.has(c.column_id)) cardsByColumn.set(c.column_id, []);
    cardsByColumn.get(c.column_id).push(c);
  }
  const iso = (t) => new Date(t).toISOString();
  for (const col of board.columns) {
    const cards = cardsByColumn.get(col.id) || [];
    if (cards.length === 0) {
      rows.push([csvEscape(board.title), csvEscape(col.title), '', '', '', '', '', ''].join(','));
      continue;
    }
    for (const card of cards) {
      const comments = commentsByCard.get(card.id) || [];
      if (comments.length === 0) {
        rows.push(
          [
            csvEscape(board.title),
            csvEscape(col.title),
            csvEscape(card.content),
            csvEscape(card.author_name),
            csvEscape(iso(card.created_at)),
            '',
            '',
            '',
          ].join(',')
        );
      } else {
        for (const cm of comments) {
          rows.push(
            [
              csvEscape(board.title),
              csvEscape(col.title),
              csvEscape(card.content),
              csvEscape(card.author_name),
              csvEscape(iso(card.created_at)),
              csvEscape(cm.content),
              csvEscape(cm.author_name),
              csvEscape(iso(cm.created_at)),
            ].join(',')
          );
        }
      }
    }
  }
  return rows.join('\n') + '\n';
}
