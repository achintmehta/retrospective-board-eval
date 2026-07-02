const express = require('express');
const { getFullBoard } = require('../db');

const router = express.Router();

function escapeCsv(str) {
  if (str == null) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

router.get('/:id/export', (req, res) => {
  const board = getFullBoard(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const rows = [['Column', 'Card', 'Author', 'Created', 'Comment', 'Comment Author', 'Comment Time']];

  for (const col of board.columns) {
    for (const card of col.cards) {
      if (card.comments && card.comments.length > 0) {
        for (const comment of card.comments) {
          rows.push([
            col.title,
            card.content,
            card.author_name,
            card.created_at,
            comment.content,
            comment.author_name,
            comment.created_at,
          ]);
        }
      } else {
        rows.push([
          col.title,
          card.content,
          card.author_name,
          card.created_at,
          '',
          '',
          '',
        ]);
      }
    }
  }

  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${board.title.replace(/[^a-zA-Z0-9]/g, '_')}_export.csv"`);
  res.send(csv);
});

module.exports = router;
