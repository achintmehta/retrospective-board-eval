const express = require('express');
const { getBoardById } = require('../db');

module.exports = function (db) {
  const router = express.Router();

  router.get('/:id/export', (req, res) => {
    const board = getBoardById(db, req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const rows = [];
    rows.push(['Column', 'Card', 'Author', 'Created At', 'Comment', 'Comment Author', 'Comment Date']);

    for (const column of board.columns) {
      if (column.cards.length === 0) {
        rows.push([column.title, '', '', '', '', '', '']);
        continue;
      }
      for (const card of column.cards) {
        if (!card.comments || card.comments.length === 0) {
          rows.push([
            column.title,
            card.content,
            card.author_name,
            card.created_at,
            '',
            '',
            ''
          ]);
        } else {
          for (const comment of card.comments) {
            rows.push([
              column.title,
              card.content,
              card.author_name,
              card.created_at,
              comment.content,
              comment.author_name,
              comment.created_at
            ]);
          }
        }
      }
    }

    const escapeCsv = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${board.title}-export.csv"`);
    res.send(csv);
  });

  return router;
};
