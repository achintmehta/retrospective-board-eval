const express = require('express');
const { queries } = require('./db');

const router = express.Router();

router.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const result = queries.createBoard.run(title.trim());
  const board = queries.getBoardById.get(result.lastInsertRowid);
  res.status(201).json(board);
});

router.get('/api/boards', (req, res) => {
  const boards = queries.getAllBoards.all();
  res.json(boards);
});

router.get('/api/boards/:id', (req, res) => {
  const board = queries.getBoardById.get(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const columns = queries.getColumnsByBoard.all(board.id);
  const cards = queries.getCardsByBoardColumns.all(board.id);
  const comments = queries.getCommentsByBoard.all(board.id);

  const commentsByCard = {};
  for (const comment of comments) {
    if (!commentsByCard[comment.card_id]) commentsByCard[comment.card_id] = [];
    commentsByCard[comment.card_id].push(comment);
  }

  const cardsByColumn = {};
  for (const card of cards) {
    card.comments = commentsByCard[card.id] || [];
    if (!cardsByColumn[card.column_id]) cardsByColumn[card.column_id] = [];
    cardsByColumn[card.column_id].push(card);
  }

  for (const col of columns) {
    col.cards = cardsByColumn[col.id] || [];
  }

  res.json({ ...board, columns });
});

router.post('/api/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }
  const board = queries.getBoardById.get(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  const { max_pos } = queries.getMaxColumnPosition.get(board.id);
  const result = queries.createColumn.run(board.id, title.trim(), max_pos + 1);
  const column = { id: Number(result.lastInsertRowid), board_id: board.id, title: title.trim(), position: max_pos + 1, cards: [] };
  res.status(201).json(column);
});

router.get('/api/boards/:id/export', (req, res) => {
  const board = queries.getBoardById.get(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const columns = queries.getColumnsByBoard.all(board.id);
  const cards = queries.getCardsByBoardColumns.all(board.id);
  const comments = queries.getCommentsByBoard.all(board.id);

  const commentsByCard = {};
  for (const comment of comments) {
    if (!commentsByCard[comment.card_id]) commentsByCard[comment.card_id] = [];
    commentsByCard[comment.card_id].push(comment);
  }

  const columnMap = {};
  for (const col of columns) {
    columnMap[col.id] = col.title;
  }

  const escapeCsv = (str) => {
    if (str == null) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const rows = [['Column', 'Card', 'Author', 'Created At', 'Comments'].join(',')];
  for (const card of cards) {
    const cardComments = commentsByCard[card.id] || [];
    const commentsText = cardComments.map(c => `${c.author_name}: ${c.content}`).join(' | ');
    rows.push([
      escapeCsv(columnMap[card.column_id]),
      escapeCsv(card.content),
      escapeCsv(card.author_name),
      escapeCsv(card.created_at),
      escapeCsv(commentsText),
    ].join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${board.title.replace(/"/g, '')}-export.csv"`);
  res.send(rows.join('\n'));
});

module.exports = router;
