const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const {
  createBoard,
  getAllBoards,
  getBoardWithDetails,
  createColumn,
  createCard,
  moveCard,
  createComment,
} = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// ---- REST API ----

app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  try {
    const board = createBoard(title.trim());
    res.status(201).json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

app.get('/api/boards', (_req, res) => {
  res.json(getAllBoards());
});

app.get('/api/boards/:id', (req, res) => {
  const board = getBoardWithDetails(Number(req.params.id));
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

app.post('/api/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const column = createColumn(Number(req.params.id), title.trim());
  io.to(`board:${req.params.id}`).emit('column_added', column);
  res.status(201).json(column);
});

app.get('/api/boards/:id/export', (req, res) => {
  const board = getBoardWithDetails(Number(req.params.id));
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const rows = [['Column', 'Card', 'Author', 'Comment', 'Comment Author']];

  for (const col of board.columns) {
    if (col.cards.length === 0) {
      rows.push([col.title, '', '', '', '']);
    }
    for (const card of col.cards) {
      if (card.comments.length === 0) {
        rows.push([col.title, card.content, card.author_name, '', '']);
      }
      for (const comment of card.comments) {
        rows.push([col.title, card.content, card.author_name, comment.content, comment.author_name]);
      }
    }
  }

  const csv = rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="board-${board.id}.csv"`);
  res.send(csv);
});

// ---- Socket.io ----

io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
    const card = createCard(columnId, content, authorName);
    io.to(`board:${boardId}`).emit('card_added', card);
  });

  socket.on('move_card', ({ boardId, cardId, newColumnId, newPosition }) => {
    const result = moveCard(cardId, newColumnId, newPosition);
    io.to(`board:${boardId}`).emit('card_moved', result);
  });

  socket.on('add_comment', ({ boardId, cardId, content, authorName }) => {
    const comment = createComment(cardId, content, authorName);
    io.to(`board:${boardId}`).emit('comment_added', comment);
  });
});

// SPA fallback
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
