const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { initDb, createCard, getCardCountForColumn, moveCard, createComment, getCardById } = require('./db');
const boardsRouter = require('./routes/boards');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173'
}));
app.use(express.json());

// REST API
app.use('/api/boards', boardsRouter);

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}

// Socket.io real-time collaboration
io.on('connection', (socket) => {
  // Join a board room
  socket.on('join_board', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('leave_board', (boardId) => {
    socket.leave(`board:${boardId}`);
  });

  // Add a card
  socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
    if (!boardId || !columnId || !content || !authorName) return;

    const cardId = uuidv4();
    const position = getCardCountForColumn(columnId);
    const card = createCard(cardId, columnId, content.trim(), authorName, position);

    io.to(`board:${boardId}`).emit('card_added', { card, columnId });
  });

  // Move a card
  socket.on('move_card', ({ boardId, cardId, newColumnId, newPosition }) => {
    if (!boardId || !cardId || !newColumnId) return;

    moveCard(cardId, newColumnId, newPosition ?? 0);
    const card = getCardById(cardId);

    io.to(`board:${boardId}`).emit('card_moved', { card, newColumnId, newPosition: newPosition ?? 0 });
  });

  // Add a comment
  socket.on('add_comment', ({ boardId, cardId, content, authorName }) => {
    if (!boardId || !cardId || !content || !authorName) return;

    const commentId = uuidv4();
    const comment = createComment(commentId, cardId, content.trim(), authorName);

    io.to(`board:${boardId}`).emit('comment_added', { comment, cardId });
  });

  // Add a column (real-time broadcast)
  socket.on('add_column', ({ boardId, column }) => {
    if (!boardId || !column) return;
    socket.to(`board:${boardId}`).emit('column_added', { column });
  });
});

const PORT = process.env.PORT || 3001;

initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Retro Board server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
