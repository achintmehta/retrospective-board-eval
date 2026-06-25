const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

// Serve frontend in production
if (isProd) {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
}

// ─── REST API ──────────────────────────────────────────────────────────────

// Task 3.2 - GET all boards
app.get('/api/boards', (req, res) => {
  const boards = db.getAllBoards();
  res.json(boards);
});

// Task 3.1 - POST create a board (with default columns)
app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const boardId = uuidv4();
  const board = db.createBoard(boardId, title.trim());

  // Create default retro columns
  const defaultColumns = ['Went Well', 'Needs Improvement', 'Action Items'];
  for (const colTitle of defaultColumns) {
    db.createColumn(uuidv4(), boardId, colTitle);
  }

  const fullBoard = db.getBoardById(boardId);
  res.status(201).json(fullBoard);
});

// Task 3.3 - GET a specific board with columns, cards, comments
app.get('/api/boards/:id', (req, res) => {
  const board = db.getBoardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

// Task 3.4 - POST create a column on a board
app.post('/api/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const board = db.boardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const column = db.createColumn(uuidv4(), req.params.id, title.trim());
  // Broadcast new column to all clients in the board room
  io.to(req.params.id).emit('column_added', column);
  res.status(201).json(column);
});

// Task 7.1 - GET export board as CSV
app.get('/api/boards/:id/export', (req, res) => {
  const board = db.getBoardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const lines = [
    'Board,Column,Card,Author,Created At,Comments',
  ];

  for (const col of board.columns) {
    for (const card of col.cards) {
      const commentsStr = card.comments
        .map((c) => `${c.author_name}: ${c.content}`)
        .join(' | ');
      const row = [
        csvEscape(board.title),
        csvEscape(col.title),
        csvEscape(card.content),
        csvEscape(card.author_name),
        csvEscape(card.created_at),
        csvEscape(commentsStr),
      ];
      lines.push(row.join(','));
    }
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="retro-${board.title.replace(/\s+/g, '-')}.csv"`);
  res.send(lines.join('\n'));
});

function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Catch-all for SPA in production (app.use avoids Express 5 path-to-regexp wildcard syntax)
if (isProd) {
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}

// ─── SOCKET.IO ─────────────────────────────────────────────────────────────

// Task 5.1 - Socket.io initialized; 5.2 - room logic
io.on('connection', (socket) => {
  // Task 5.2 - join a board room
  socket.on('join_board', ({ boardId }) => {
    socket.join(boardId);
  });

  // Task 5.3 - add_card event
  socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
    if (!boardId || !columnId || !content || !authorName) return;
    const card = db.createCard(uuidv4(), columnId, content, authorName);
    io.to(boardId).emit('card_added', card);
  });

  // Task 5.4 - move_card event
  socket.on('move_card', ({ boardId, cardId, targetColumnId, targetPosition }) => {
    if (!boardId || !cardId || !targetColumnId) return;
    const position = typeof targetPosition === 'number' ? targetPosition : 0;
    const card = db.moveCard(cardId, targetColumnId, position);
    io.to(boardId).emit('card_moved', { cardId, targetColumnId, targetPosition: position });
  });

  // Task 5.5 - add_comment event
  socket.on('add_comment', ({ boardId, cardId, content, authorName }) => {
    if (!boardId || !cardId || !content || !authorName) return;
    const comment = db.createComment(uuidv4(), cardId, content, authorName);
    io.to(boardId).emit('comment_added', { ...comment, card_id: cardId });
  });
});

server.listen(PORT, () => {
  console.log(`Retro board server running on http://localhost:${PORT}`);
});
