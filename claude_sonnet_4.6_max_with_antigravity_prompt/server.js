const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173';

const io = new Server(server, {
  cors: CLIENT_ORIGIN ? { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] } : {}
});

const PORT = process.env.PORT || 3001;

app.use(cors({ origin: CLIENT_ORIGIN || '*' }));
app.use(express.json());

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
}

// --- REST API ---

// 3.1 Create a new board
app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  const board = db.createBoard(title.trim());
  res.status(201).json(board);
});

// 3.2 Fetch all boards
app.get('/api/boards', (req, res) => {
  res.json(db.getAllBoards());
});

// 3.3 Fetch a specific board with columns, cards, and comments
app.get('/api/boards/:id', (req, res) => {
  const board = db.getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

// 3.4 Create a column on a board
app.post('/api/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  const column = db.createColumn(req.params.id, title.trim());
  const columnWithCards = { ...column, cards: [] };
  io.to(req.params.id).emit('column_added', columnWithCards);
  res.status(201).json(columnWithCards);
});

// 7.1 Export board as CSV
app.get('/api/boards/:id/export', (req, res) => {
  const board = db.getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const filename = `${board.title.replace(/[^a-z0-9]/gi, '_')}_export.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const escape = str => `"${String(str || '').replace(/"/g, '""')}"`;

  let csv = 'Column,Card Author,Card Content,Comment Author,Comment Content,Comment Date\n';
  board.columns.forEach(col => {
    if (col.cards.length === 0) {
      csv += `${escape(col.title)},,,,,\n`;
    }
    col.cards.forEach(card => {
      if (card.comments.length === 0) {
        csv += `${escape(col.title)},${escape(card.author_name)},${escape(card.content)},,,\n`;
      }
      card.comments.forEach(comment => {
        csv += `${escape(col.title)},${escape(card.author_name)},${escape(card.content)},${escape(comment.author_name)},${escape(comment.content)},${escape(comment.created_at)}\n`;
      });
    });
  });

  res.send(csv);
});

// SPA fallback in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}

// --- Socket.io: Real-Time Collaboration ---

io.on('connection', (socket) => {
  // 5.2 Room-joining logic
  socket.on('join_board', ({ boardId, displayName }) => {
    socket.join(boardId);
    socket.data.boardId = boardId;
    socket.data.displayName = displayName;
    socket.to(boardId).emit('user_joined', { displayName });
  });

  // 5.3 add_card → save to DB and broadcast card_added
  socket.on('add_card', ({ columnId, content }) => {
    if (!socket.data.boardId || !socket.data.displayName) return;
    const card = db.addCard(columnId, content, socket.data.displayName);
    io.to(socket.data.boardId).emit('card_added', card);
  });

  // 5.4 move_card → update DB position and broadcast card_moved
  socket.on('move_card', ({ cardId, newColumnId, newPosition }) => {
    if (!socket.data.boardId) return;
    db.moveCard(cardId, newColumnId, newPosition);
    io.to(socket.data.boardId).emit('card_moved', { cardId, newColumnId, newPosition });
  });

  // 5.5 add_comment → save to DB and broadcast comment_added
  socket.on('add_comment', ({ cardId, content }) => {
    if (!socket.data.boardId || !socket.data.displayName) return;
    const comment = db.addComment(cardId, content, socket.data.displayName);
    io.to(socket.data.boardId).emit('comment_added', { cardId, comment });
  });

  socket.on('disconnect', () => {
    if (socket.data.boardId) {
      socket.to(socket.data.boardId).emit('user_left', { displayName: socket.data.displayName });
    }
  });
});

// Start server after DB is initialized
db.init().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Retro Board server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
