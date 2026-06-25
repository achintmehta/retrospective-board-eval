const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const {
  getAllBoards,
  getBoardById,
  createBoard,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getFullBoard,
  getBoardExportData,
} = require('./src/queries');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

// Serve built frontend in production
if (isProd) {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
}

// ──────────────────────────────────────────────
// REST API
// ──────────────────────────────────────────────

// 3.2 Fetch all boards
app.get('/api/boards', (req, res) => {
  res.json(getAllBoards());
});

// 3.1 Create a new board
app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
  const board = createBoard(title.trim());
  res.status(201).json(board);
});

// 3.3 Fetch a specific board (full nested data)
app.get('/api/boards/:id', (req, res) => {
  const board = getFullBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

// 3.4 Create a column on a board
app.post('/api/boards/:id/columns', (req, res) => {
  const board = getBoardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
  const column = createColumn(req.params.id, title.trim());

  // Broadcast column addition to all clients in board room
  io.to(req.params.id).emit('column_added', column);
  res.status(201).json(column);
});

// 7.1 Export board to CSV
app.get('/api/boards/:id/export', (req, res) => {
  const board = getBoardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const rows = getBoardExportData(req.params.id);
  const headers = ['Board', 'Column', 'Card Content', 'Card Author', 'Card Created At', 'Comment', 'Comment Author', 'Comment Created At'];

  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csvLines = [
    headers.join(','),
    ...rows.map((r) =>
      [r.board_title, r.column_title, r.card_content, r.card_author, r.card_created_at, r.comment_content, r.comment_author, r.comment_created_at]
        .map(escape)
        .join(',')
    ),
  ];

  const filename = `retro-${board.title.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvLines.join('\n'));
});

// Fallback to index.html for SPA in production
if (isProd) {
  app.get('*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}

// ──────────────────────────────────────────────
// Socket.io – Real-Time Collaboration
// ──────────────────────────────────────────────

io.on('connection', (socket) => {
  // 5.2 Room joining
  socket.on('join_board', ({ boardId }) => {
    socket.join(boardId);
  });

  socket.on('leave_board', ({ boardId }) => {
    socket.leave(boardId);
  });

  // 5.3 Add card
  socket.on('add_card', ({ boardId, columnId, content, authorName }, ack) => {
    try {
      const card = createCard(columnId, content, authorName);
      io.to(boardId).emit('card_added', card);
      if (ack) ack({ success: true, card });
    } catch (err) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // 5.4 Move card
  socket.on('move_card', ({ boardId, cardId, newColumnId, newPosition }, ack) => {
    try {
      const card = moveCard(cardId, newColumnId, newPosition);
      io.to(boardId).emit('card_moved', card);
      if (ack) ack({ success: true, card });
    } catch (err) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // 5.5 Add comment
  socket.on('add_comment', ({ boardId, cardId, content, authorName }, ack) => {
    try {
      const comment = createComment(cardId, content, authorName);
      io.to(boardId).emit('comment_added', comment);
      if (ack) ack({ success: true, comment });
    } catch (err) {
      if (ack) ack({ success: false, error: err.message });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Retro Board server running on http://localhost:${PORT}`);
});
