const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const queries = require('./queries');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));

// --- REST API ---

app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const board = queries.createBoard(title.trim());
  res.status(201).json(board);
});

app.get('/api/boards', (req, res) => {
  const boards = queries.getAllBoards();
  res.json(boards);
});

app.get('/api/boards/:id', (req, res) => {
  const board = queries.getBoardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

app.post('/api/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }
  const column = queries.createColumn(req.params.id, title.trim());
  res.status(201).json(column);
});

app.get('/api/boards/:id/export', (req, res) => {
  const result = queries.getBoardForExport(req.params.id);
  if (!result) return res.status(404).json({ error: 'Board not found' });

  const { board, rows } = result;
  const csvHeader = 'Column,Card Content,Card Author,Card Created,Comment,Comment Author,Comment Created\n';
  const csvRows = rows.map(r => {
    return [
      csvEscape(r.column_title || ''),
      csvEscape(r.card_content || ''),
      csvEscape(r.card_author || ''),
      csvEscape(r.card_created_at || ''),
      csvEscape(r.comment_content || ''),
      csvEscape(r.comment_author || ''),
      csvEscape(r.comment_created_at || ''),
    ].join(',');
  }).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${board.title}-export.csv"`);
  res.send(csvHeader + csvRows);
});

function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// --- Socket.io ---

io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('leave_board', (boardId) => {
    socket.leave(`board:${boardId}`);
  });

  socket.on('add_card', (data) => {
    const { columnId, content, authorName } = data;
    const card = queries.createCard(columnId, content, authorName);
    io.to(`board:${data.boardId}`).emit('card_added', { columnId, card });
  });

  socket.on('move_card', (data) => {
    const { cardId, targetColumnId, targetPosition, boardId } = data;
    const card = queries.moveCard(cardId, targetColumnId, targetPosition);
    if (card) {
      io.to(`board:${boardId}`).emit('card_moved', {
        cardId,
        sourceColumnId: data.sourceColumnId,
        targetColumnId,
        targetPosition,
      });
    }
  });

  socket.on('add_comment', (data) => {
    const { cardId, content, authorName, boardId } = data;
    const comment = queries.createComment(cardId, content, authorName);
    io.to(`board:${boardId}`).emit('comment_added', { cardId, comment });
  });

  socket.on('add_column', (data) => {
    const { boardId, title } = data;
    const column = queries.createColumn(boardId, title);
    io.to(`board:${boardId}`).emit('column_added', { column });
  });
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
