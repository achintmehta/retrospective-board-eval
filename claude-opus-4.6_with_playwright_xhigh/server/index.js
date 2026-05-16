const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { boards, columns, cards, comments } = require('./queries');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Serve static frontend in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// REST API Routes

// Create a new board
app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const board = boards.create(title.trim());
  res.status(201).json(board);
});

// Get all boards
app.get('/api/boards', (req, res) => {
  res.json(boards.getAll());
});

// Get a specific board with all data
app.get('/api/boards/:id', (req, res) => {
  const board = boards.getFullBoard(Number(req.params.id));
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  res.json(board);
});

// Create a column for a board
app.post('/api/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const boardId = Number(req.params.id);
  const board = boards.getById(boardId);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  const column = columns.create(boardId, title.trim());
  res.status(201).json(column);
});

// Export board to CSV
app.get('/api/boards/:id/export', (req, res) => {
  const board = boards.getFullBoard(Number(req.params.id));
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const rows = [['Column', 'Card', 'Author', 'Comment', 'Comment Author', 'Created At']];

  for (const col of board.columns) {
    for (const card of col.cards) {
      if (card.comments.length === 0) {
        rows.push([col.title, card.content, card.author_name, '', '', card.created_at]);
      } else {
        for (const comment of card.comments) {
          rows.push([
            col.title,
            card.content,
            card.author_name,
            comment.content,
            comment.author_name,
            comment.created_at
          ]);
        }
      }
    }
  }

  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="board-${board.id}-export.csv"`);
  res.send(csv);
});

// Socket.io real-time events
io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('leave_board', (boardId) => {
    socket.leave(`board:${boardId}`);
  });

  socket.on('add_card', ({ columnId, content, authorName, boardId }) => {
    const card = cards.create(columnId, content, authorName);
    io.to(`board:${boardId}`).emit('card_added', { columnId, card });
  });

  socket.on('move_card', ({ cardId, newColumnId, newPosition, boardId }) => {
    const card = cards.move(cardId, newColumnId, newPosition);
    io.to(`board:${boardId}`).emit('card_moved', { card, newColumnId, newPosition });
  });

  socket.on('add_comment', ({ cardId, content, authorName, boardId }) => {
    const comment = comments.create(cardId, content, authorName);
    io.to(`board:${boardId}`).emit('comment_added', { cardId, comment });
  });

  socket.on('add_column', ({ boardId, title }) => {
    const column = columns.create(boardId, title);
    io.to(`board:${boardId}`).emit('column_added', { column });
  });
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
