const express = require('express');
const router = express.Router();
const {
  createBoard, getAllBoards, getFullBoard,
  createColumn, getMaxColumnPosition,
  getFullBoardForExport
} = require('../db');

router.post('/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const result = createBoard.run(title.trim());
  const board = getFullBoard(result.lastInsertRowid);
  res.status(201).json(board);
});

router.get('/boards', (req, res) => {
  const boards = getAllBoards.all();
  res.json(boards);
});

router.get('/boards/:id', (req, res) => {
  const board = getFullBoard(Number(req.params.id));
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  res.json(board);
});

router.post('/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  const boardId = Number(req.params.id);
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }
  const { max_pos } = getMaxColumnPosition.get(boardId);
  const result = createColumn.run(boardId, title.trim(), max_pos + 1);
  res.status(201).json({
    id: result.lastInsertRowid,
    board_id: boardId,
    title: title.trim(),
    position: max_pos + 1,
    cards: []
  });
});

router.get('/boards/:id/export', (req, res) => {
  const boardId = Number(req.params.id);
  const data = getFullBoardForExport(boardId);
  if (!data) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const { board, rows } = data;
  const csvHeader = 'Column,Card Content,Card Author,Card Created,Comment,Comment Author,Comment Created\n';
  const csvRows = rows.map(r => {
    const escape = (val) => {
      if (val == null) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    return [
      r.column_title, r.card_content, r.card_author, r.card_created_at,
      r.comment_content, r.comment_author, r.comment_created_at
    ].map(escape).join(',');
  }).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${board.title.replace(/"/g, '')}-export.csv"`);
  res.send(csvHeader + csvRows);
});

module.exports = router;
