const express = require('express');
const router = express.Router();
const {
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  getBoardForExport,
} = require('../queries');

router.post('/', async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Board title is required' });
  }
  try {
    const board = await createBoard(title.trim());
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const boards = await getAllBoards();
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const board = await getBoardById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/columns', async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }
  try {
    const column = await createColumn(req.params.id, title.trim());
    res.status(201).json(column);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/export', async (req, res) => {
  try {
    const board = await getBoardById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    const rows = await getBoardForExport(req.params.id);

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      ['Column', 'Card Content', 'Card Author', 'Card Created At', 'Comment Content', 'Comment Author', 'Comment Created At']
        .map(escape).join(','),
    ];

    for (const { column, card, comments } of rows) {
      if (comments.length === 0) {
        lines.push([column.title, card.content, card.author_name, card.created_at, '', '', ''].map(escape).join(','));
      } else {
        for (const comment of comments) {
          lines.push([column.title, card.content, card.author_name, card.created_at, comment.content, comment.author_name, comment.created_at].map(escape).join(','));
        }
      }
    }

    const csv = lines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="board-${req.params.id}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
