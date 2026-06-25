const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

// --- REST API ---

app.post('/api/boards', async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  const board = db.createBoard(title.trim());
  res.status(201).json(board);
});

app.get('/api/boards', async (req, res) => {
  const boards = db.getAllBoards();
  res.json(boards);
});

app.get('/api/boards/:id', async (req, res) => {
  const board = db.getBoardWithDetails(Number(req.params.id));
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

app.post('/api/boards/:id/columns', async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  const boardId = Number(req.params.id);
  const board = db.getBoardById(boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const fullBoard = db.getBoardWithDetails(boardId);
  const position = fullBoard.columns.length;
  const column = db.createColumn(boardId, title.trim(), position);
  res.status(201).json(column);
});

app.get('/api/boards/:id/export', async (req, res) => {
  const data = db.getBoardExportData(Number(req.params.id));
  if (!data) return res.status(404).json({ error: 'Board not found' });

  const escapeCsv = (str) => {
    if (str == null) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  let csv = 'Column,Card,Card Author,Comment,Comment Author\n';
  for (const row of data.rows) {
    csv += [row.column, row.card, row.cardAuthor, row.comment, row.commentAuthor].map(escapeCsv).join(',') + '\n';
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${data.board.title.replace(/"/g, '')}-export.csv"`);
  res.send(csv);
});

// --- Socket.io ---

io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('add_card', ({ columnId, content, authorName, boardId }) => {
    const card = db.createCard(columnId, content, authorName);
    io.to(`board:${boardId}`).emit('card_added', card);
  });

  socket.on('move_card', ({ cardId, newColumnId, boardId }) => {
    const card = db.moveCard(cardId, newColumnId);
    io.to(`board:${boardId}`).emit('card_moved', card);
  });

  socket.on('add_comment', ({ cardId, content, authorName, boardId }) => {
    const comment = db.createComment(cardId, content, authorName);
    io.to(`board:${boardId}`).emit('comment_added', comment);
  });
});

// --- Serve static frontend in production ---

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;

(async () => {
  await db.getDb();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
