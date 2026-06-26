const express = require('express');
const repo = require('../db/repository');

const router = express.Router();

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(row) {
  return row.map(csvEscape).join(',');
}

router.get('/:id/export', (req, res) => {
  const board = repo.getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'board not found' });

  const safeTitle = board.title.replace(/[^a-z0-9-_]+/gi, '_') || 'board';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeTitle}.csv"`
  );

  const header = [
    'board_title',
    'column',
    'card_position',
    'card_author',
    'card_created_at',
    'card_content',
    'comment_author',
    'comment_created_at',
    'comment_content',
  ];
  res.write(rowToCsv(header) + '\r\n');

  for (const column of board.columns) {
    if (column.cards.length === 0) {
      res.write(
        rowToCsv([board.title, column.title, '', '', '', '', '', '', '']) +
          '\r\n'
      );
      continue;
    }
    for (const card of column.cards) {
      if (card.comments.length === 0) {
        res.write(
          rowToCsv([
            board.title,
            column.title,
            card.position,
            card.author_name,
            card.created_at,
            card.content,
            '',
            '',
            '',
          ]) + '\r\n'
        );
      } else {
        for (const comment of card.comments) {
          res.write(
            rowToCsv([
              board.title,
              column.title,
              card.position,
              card.author_name,
              card.created_at,
              card.content,
              comment.author_name,
              comment.created_at,
              comment.content,
            ]) + '\r\n'
          );
        }
      }
    }
  }
  res.end();
});

module.exports = router;
