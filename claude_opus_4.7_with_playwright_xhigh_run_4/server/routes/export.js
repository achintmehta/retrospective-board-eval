const express = require('express');
const queries = require('../db/queries');

const router = express.Router();

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(board) {
  const columnsById = new Map(board.columns.map((c) => [c.id, c]));
  const commentsByCard = new Map();
  for (const comment of board.comments) {
    if (!commentsByCard.has(comment.card_id)) commentsByCard.set(comment.card_id, []);
    commentsByCard.get(comment.card_id).push(comment);
  }

  const rows = [
    [
      'type',
      'column',
      'card_content',
      'card_author',
      'card_created_at',
      'comment_content',
      'comment_author',
      'comment_created_at',
    ],
  ];

  // Stable order: by column position then card position
  const sortedColumns = [...board.columns].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)
  );
  for (const col of sortedColumns) {
    const cards = board.cards
      .filter((c) => c.column_id === col.id)
      .sort(
        (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)
      );

    if (cards.length === 0) {
      rows.push(['column', col.title, '', '', '', '', '', '']);
      continue;
    }

    for (const card of cards) {
      rows.push([
        'card',
        col.title,
        card.content,
        card.author_name,
        card.created_at,
        '',
        '',
        '',
      ]);
      const comments = commentsByCard.get(card.id) ?? [];
      for (const comment of comments) {
        rows.push([
          'comment',
          col.title,
          card.content,
          card.author_name,
          card.created_at,
          comment.content,
          comment.author_name,
          comment.created_at,
        ]);
      }
    }
  }

  // Note: `columnsById` is kept around for symmetry with future per-card lookups.
  void columnsById;

  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n') + '\r\n';
}

// GET /api/boards/:id/export — download board as CSV
router.get('/boards/:id/export', (req, res) => {
  const board = queries.getFullBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found.' });

  const csv = buildCsv(board);
  const safeTitle = board.title.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80) || 'board';
  const filename = `${safeTitle}-${board.id.slice(0, 8)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

module.exports = router;
module.exports.buildCsv = buildCsv;
