const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { boards, columns, cards, comments, exportBoard } = require('./queries');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Serve static frontend in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// ─── REST API ───

app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const board = boards.create(title.trim());
  res.status(201).json(board);
});

app.get('/api/boards', (req, res) => {
  res.json(boards.getAll());
});

app.get('/api/boards/:id', (req, res) => {
  const board = boards.getFull(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

app.post('/api/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }
  const board = boards.getById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const column = columns.create(req.params.id, title.trim());
  io.to(req.params.id).emit('column_added', column);
  res.status(201).json(column);
});

app.get('/api/boards/:id/export', (req, res) => {
  const csv = exportBoard.toCSV(req.params.id);
  if (csv === null) return res.status(404).json({ error: 'Board not found' });
  const board = boards.getById(req.params.id);
  const filename = `${board.title.replace(/[^a-z0-9]/gi, '_')}_export.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// ─── Socket.io ───

io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(boardId);
  });

  socket.on('add_card', (data) => {
    const { columnId, content, authorName, boardId } = data;
    const card = cards.create(columnId, content, authorName);
    io.to(boardId).emit('card_added', { columnId, card });
  });

  socket.on('move_card', (data) => {
    const { cardId, newColumnId, newPosition, boardId } = data;
    const card = cards.move(cardId, newColumnId, newPosition);
    io.to(boardId).emit('card_moved', { cardId, newColumnId, newPosition, card });
  });

  socket.on('add_comment', (data) => {
    const { cardId, content, authorName, boardId } = data;
    const comment = comments.create(cardId, content, authorName);
    io.to(boardId).emit('comment_added', { cardId, comment });
  });
});

// SPA fallback for production
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
