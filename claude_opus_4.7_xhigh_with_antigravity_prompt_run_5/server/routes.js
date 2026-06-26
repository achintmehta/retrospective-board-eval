const express = require('express');
const {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
  getBoardExportRows,
} = require('./db');

const router = express.Router();

router.get('/boards', (req, res) => {
  res.json(listBoards());
});

router.post('/boards', (req, res) => {
  try {
    const board = createBoard(req.body?.title);
    res.status(201).json(board);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/boards/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

router.post('/boards/:id/columns', (req, res) => {
  try {
    const column = createColumn(req.params.id, req.body?.title);
    res.status(201).json(column);

    const io = req.app.get('io');
    if (io) io.to(`board:${req.params.id}`).emit('column_added', { column });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

router.get('/boards/:id/export', (req, res) => {
  const result = getBoardExportRows(req.params.id);
  if (!result) return res.status(404).json({ error: 'Board not found' });

  const { board, rows } = result;
  const safeTitle = board.title.replace(/[^a-z0-9\-_]+/gi, '_').slice(0, 60) || 'board';
  const filename = `${safeTitle}-${board.id.slice(0, 8)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const headers = [
    'column',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ];
  res.write(headers.join(',') + '\n');
  for (const row of rows) {
    const line = headers.map((h) => csvEscape(row[h])).join(',');
    res.write(line + '\n');
  }
  res.end();
});

module.exports = router;
