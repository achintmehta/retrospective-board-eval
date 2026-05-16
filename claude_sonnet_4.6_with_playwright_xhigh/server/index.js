const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

// --- REST API ---

// Task 3.2: List all boards
app.get('/api/boards', (req, res) => {
  res.json(db.getAllBoards());
});

// Task 3.1: Create a board
app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
  const board = db.createBoard(uuidv4(), title.trim());
  res.status(201).json(board);
});

// Task 3.3: Get a board with columns, cards, and comments
app.get('/api/boards/:id', (req, res) => {
  const board = db.getBoardWithDetails(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

// Task 3.4: Create a column on a board
app.post('/api/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
  const column = db.createColumn(uuidv4(), req.params.id, title.trim());
  res.status(201).json(column);
});

// Task 7.1: Export board as CSV
app.get('/api/boards/:id/export', (req, res) => {
  const data = db.getBoardExportData(req.params.id);
  if (!data) return res.status(404).json({ error: 'Board not found' });

  const { board, columns, cards, comments } = data;
  const colMap = Object.fromEntries(columns.map(c => [c.id, c.title]));
  const commentsMap = {};
  for (const cm of comments) {
    if (!commentsMap[cm.card_id]) commentsMap[cm.card_id] = [];
    commentsMap[cm.card_id].push(`${cm.author_name}: ${cm.content}`);
  }

  const rows = [['Column', 'Card', 'Author', 'Created At', 'Comments']];
  for (const card of cards) {
    rows.push([
      colMap[card.column_id] || '',
      card.content,
      card.author_name,
      card.created_at,
      (commentsMap[card.id] || []).join(' | '),
    ]);
  }

  const csv = rows
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const safeName = board.title.replace(/[^a-z0-9]/gi, '_');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
  res.send(csv);
});

// --- Socket.io (Tasks 5.1–5.5) ---

// Task 5.1: Initialize Socket.io on the Express server
io.on('connection', (socket) => {
  // Task 5.2: Room-joining logic for boards
  socket.on('join_board', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  // Task 5.3: add_card → save to DB and broadcast card_added
  socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
    const card = db.createCard(uuidv4(), columnId, content, authorName);
    io.to(`board:${boardId}`).emit('card_added', card);
  });

  // Task 5.4: move_card → update DB position and broadcast card_moved
  socket.on('move_card', ({ boardId, cardId, newColumnId, newPosition }) => {
    db.moveCard(cardId, newColumnId, newPosition);
    io.to(`board:${boardId}`).emit('card_moved', { cardId, newColumnId, newPosition });
  });

  // Task 5.5: add_comment → save to DB and broadcast comment_added
  socket.on('add_comment', ({ boardId, cardId, content, authorName }) => {
    const comment = db.createComment(uuidv4(), cardId, content, authorName);
    io.to(`board:${boardId}`).emit('comment_added', comment);
  });

  // add_column → save to DB and broadcast column_added (supports real-time column creation)
  socket.on('add_column', ({ boardId, title }) => {
    const column = db.createColumn(uuidv4(), boardId, title);
    io.to(`board:${boardId}`).emit('column_added', column);
  });
});

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
db.init().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
