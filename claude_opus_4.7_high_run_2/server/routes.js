const express = require('express');
const repo = require('./repository');

function createRouter(io) {
  const router = express.Router();

  // 3.1 Create board
  router.post('/boards', (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    const board = repo.createBoard(title);
    res.status(201).json(board);
  });

  // 3.2 List boards
  router.get('/boards', (_req, res) => {
    res.json(repo.listBoards());
  });

  // 3.3 Get a specific board with columns, cards, comments
  router.get('/boards/:id', (req, res) => {
    const board = repo.getBoardWithChildren(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json(board);
  });

  // 3.4 Create board column
  router.post('/boards/:id/columns', (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    const column = repo.createColumn(req.params.id, title);
    if (!column) return res.status(404).json({ error: 'board not found' });

    if (io) {
      io.to(`board:${req.params.id}`).emit('column_added', column);
    }
    res.status(201).json(column);
  });

  // 7.1 Export to CSV
  router.get('/boards/:id/export', (req, res) => {
    const board = repo.getBoardForExport(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    const csv = boardToCsv(board);
    const safeName = board.title.replace(/[^a-z0-9-_]+/gi, '_');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName || 'board'}.csv"`
    );
    res.send(csv);
  });

  return router;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function boardToCsv(board) {
  const header = [
    'board_id',
    'board_title',
    'column_id',
    'column_title',
    'card_id',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_id',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ];
  const rows = [header.join(',')];

  for (const column of board.columns) {
    if (column.cards.length === 0) {
      rows.push(
        [board.id, board.title, column.id, column.title, '', '', '', '', '', '', '', '']
          .map(csvEscape)
          .join(',')
      );
      continue;
    }
    for (const card of column.cards) {
      const cardCreated = new Date(card.createdAt).toISOString();
      if (card.comments.length === 0) {
        rows.push(
          [
            board.id,
            board.title,
            column.id,
            column.title,
            card.id,
            card.content,
            card.authorName,
            cardCreated,
            '',
            '',
            '',
            '',
          ]
            .map(csvEscape)
            .join(',')
        );
        continue;
      }
      for (const comment of card.comments) {
        rows.push(
          [
            board.id,
            board.title,
            column.id,
            column.title,
            card.id,
            card.content,
            card.authorName,
            cardCreated,
            comment.id,
            comment.content,
            comment.authorName,
            new Date(comment.createdAt).toISOString(),
          ]
            .map(csvEscape)
            .join(',')
        );
      }
    }
  }

  return rows.join('\n') + '\n';
}

module.exports = { createRouter, boardToCsv };
