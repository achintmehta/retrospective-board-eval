const express = require('express');
const queries = require('../db/queries');

const router = express.Router();

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

// POST /api/boards — create a new board
router.post('/', (req, res) => {
  const title = (req.body?.title ?? '').toString().trim();
  if (!title) {
    return res.status(400).json({ error: 'Board title is required.' });
  }
  if (title.length > 200) {
    return res.status(400).json({ error: 'Board title must be 200 characters or fewer.' });
  }

  const board = queries.createBoard(title);

  // Seed with default retro columns if requested (default true)
  const seedDefaults = req.body?.seedDefaults !== false;
  if (seedDefaults) {
    for (const colTitle of DEFAULT_COLUMNS) {
      queries.createColumn(board.id, colTitle);
    }
  }

  res.status(201).json(queries.getFullBoard(board.id));
});

// GET /api/boards — list all boards
router.get('/', (_req, res) => {
  res.json(queries.listBoards());
});

// GET /api/boards/:id — full board with columns, cards, comments
router.get('/:id', (req, res) => {
  const board = queries.getFullBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found.' });
  res.json(board);
});

// POST /api/boards/:id/columns — add a column
router.post('/:id/columns', (req, res) => {
  const title = (req.body?.title ?? '').toString().trim();
  if (!title) {
    return res.status(400).json({ error: 'Column title is required.' });
  }
  if (title.length > 100) {
    return res.status(400).json({ error: 'Column title must be 100 characters or fewer.' });
  }

  const column = queries.createColumn(req.params.id, title);
  if (!column) return res.status(404).json({ error: 'Board not found.' });

  // Notify connected clients in the board room, if Socket.io is mounted
  const io = req.app.get('io');
  if (io) io.to(`board:${req.params.id}`).emit('column_added', column);

  res.status(201).json(column);
});

module.exports = router;
