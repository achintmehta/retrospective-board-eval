const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { boards, columns, cards, comments } = require('./queries');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// --- REST API ---

app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const board = boards.create(title.trim());
  res.status(201).json(board);
});

app.get('/api/boards', (_req, res) => {
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
  const existing = columns.getByBoard(req.params.id);
  const position = existing.length;
  const column = columns.create(req.params.id, title.trim(), position);
  io.to(req.params.id).emit('column_added', column);
  res.status(201).json(column);
});

app.get('/api/boards/:id/export', (req, res) => {
  const board = boards.getFull(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const rows = [['Column', 'Card', 'Author', 'Created At', 'Comment', 'Comment Author', 'Comment Date']];

  for (const col of board.columns) {
    if (col.cards.length === 0) {
      rows.push([col.title, '', '', '', '', '', '']);
    }
    for (const card of col.cards) {
      if (card.comments.length === 0) {
        rows.push([col.title, card.content, card.author_name, card.created_at, '', '', '']);
      }
      for (const comment of card.comments) {
        rows.push([
          col.title,
          card.content,
          card.author_name,
          card.created_at,
          comment.content,
          comment.author_name,
          comment.created_at,
        ]);
      }
    }
  }

  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${board.title}.csv"`);
  res.send(csvContent);
});

// --- Socket.io ---

io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(boardId);
  });

  socket.on('add_card', (data) => {
    try {
      const { columnId, content, authorName, boardId } = data;
      const card = cards.create(columnId, content, authorName);
      io.to(boardId).emit('card_added', { columnId, card });
    } catch (err) {
      console.error('add_card error:', err.message, 'data:', JSON.stringify(data));
    }
  });

  socket.on('move_card', (data) => {
    try {
      const { cardId, newColumnId, newPosition, boardId } = data;
      const card = cards.move(cardId, newColumnId, newPosition);
      io.to(boardId).emit('card_moved', { card, newColumnId, newPosition });
    } catch (err) {
      console.error('move_card error:', err.message, 'data:', JSON.stringify(data));
    }
  });

  socket.on('add_comment', (data) => {
    try {
      const { cardId, content, authorName, boardId } = data;
      const comment = comments.create(cardId, content, authorName);
      io.to(boardId).emit('comment_added', { cardId, comment });
    } catch (err) {
      console.error('add_comment error:', err.message, 'data:', JSON.stringify(data));
    }
  });
});

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
