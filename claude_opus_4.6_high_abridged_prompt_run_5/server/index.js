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

app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const board = db.insertBoard(title.trim());
  res.status(201).json(board);
});

app.get('/api/boards', (_req, res) => {
  const boards = db.listBoards();
  res.json(boards);
});

app.get('/api/boards/:id', (req, res) => {
  const board = db.getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const columns = db.getColumnsWithCards(board.id);
  res.json({ ...board, columns });
});

app.post('/api/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }
  const board = db.getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const column = db.insertColumn(board.id, title.trim());
  io.to(`board:${board.id}`).emit('column_added', column);
  res.status(201).json(column);
});

app.get('/api/boards/:id/export', (req, res) => {
  const data = db.getBoardExportData(Number(req.params.id));
  if (!data) return res.status(404).json({ error: 'Board not found' });

  const rows = [['Column', 'Card', 'Author', 'Comment', 'Comment Author', 'Created At']];

  for (const col of data.columns) {
    if (col.cards.length === 0) {
      rows.push([col.title, '', '', '', '', '']);
    }
    for (const card of col.cards) {
      if (card.comments.length === 0) {
        rows.push([col.title, card.content, card.author_name, '', '', card.created_at]);
      }
      for (const comment of card.comments) {
        rows.push([
          col.title,
          card.content,
          card.author_name,
          comment.content,
          comment.author_name,
          comment.created_at,
        ]);
      }
    }
  }

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="board-${data.board.id}.csv"`);
  res.send(csv);
});

// --- Socket.io ---

io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('add_card', ({ columnId, content, authorName, boardId }) => {
    const card = db.insertCard(columnId, content, authorName);
    io.to(`board:${boardId}`).emit('card_added', card);
  });

  socket.on('move_card', ({ cardId, newColumnId, newPosition, boardId }) => {
    const result = db.updateCardPosition(cardId, newColumnId, newPosition);
    socket.to(`board:${boardId}`).emit('card_moved', result);
  });

  socket.on('add_comment', ({ cardId, content, authorName, boardId }) => {
    const comment = db.insertComment(cardId, content, authorName);
    io.to(`board:${boardId}`).emit('comment_added', comment);
  });
});

// --- Serve static frontend in production ---

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
