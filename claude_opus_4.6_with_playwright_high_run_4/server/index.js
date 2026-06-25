const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { db, queries } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Serve static frontend in production
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));

// --- REST API ---

// Create a new board
app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const result = queries.createBoard.run(title.trim());
  const board = queries.getBoardById.get(result.lastInsertRowid);
  res.status(201).json(board);
});

// Fetch all boards
app.get('/api/boards', (req, res) => {
  const boards = queries.getAllBoards.all();
  res.json(boards);
});

// Fetch a specific board with columns, cards, and comments
app.get('/api/boards/:id', (req, res) => {
  const board = queries.getBoardById.get(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const columns = queries.getColumnsByBoardId.all(board.id);
  const columnsWithCards = columns.map((col) => {
    const cards = queries.getCardsByColumnId.all(col.id);
    const cardsWithComments = cards.map((card) => {
      const comments = queries.getCommentsByCardId.all(card.id);
      return { ...card, comments };
    });
    return { ...col, cards: cardsWithComments };
  });

  res.json({ ...board, columns: columnsWithCards });
});

// Create board columns
app.post('/api/boards/:id/columns', (req, res) => {
  const board = queries.getBoardById.get(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }
  const { maxPos } = queries.getMaxColumnPosition.get(board.id);
  const result = queries.createColumn.run(board.id, title.trim(), maxPos + 1);
  const column = { id: Number(result.lastInsertRowid), board_id: board.id, title: title.trim(), position: maxPos + 1, cards: [] };
  res.status(201).json(column);
});

// Export board to CSV
app.get('/api/boards/:id/export', (req, res) => {
  const board = queries.getBoardById.get(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const columns = queries.getColumnsByBoardId.all(board.id);
  const rows = [['Column', 'Card', 'Author', 'Created At', 'Comment', 'Comment Author', 'Comment Created At']];

  for (const col of columns) {
    const cards = queries.getCardsByColumnId.all(col.id);
    if (cards.length === 0) {
      rows.push([col.title, '', '', '', '', '', '']);
    }
    for (const card of cards) {
      const comments = queries.getCommentsByCardId.all(card.id);
      if (comments.length === 0) {
        rows.push([col.title, card.content, card.author_name, card.created_at, '', '', '']);
      }
      for (const comment of comments) {
        rows.push([col.title, card.content, card.author_name, card.created_at, comment.content, comment.author_name, comment.created_at]);
      }
    }
  }

  const csvContent = rows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="board-${board.id}-export.csv"`);
  res.send(csvContent);
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  }
});

// --- Socket.io ---

io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('add_card', (data) => {
    const { column_id, content, author_name } = data;
    const { maxPos } = queries.getMaxCardPosition.get(column_id);
    const result = queries.createCard.run(column_id, content, author_name, maxPos + 1);
    const card = queries.getCardById.get(result.lastInsertRowid);
    card.comments = [];

    const col = db.prepare('SELECT board_id FROM board_columns WHERE id = ?').get(column_id);
    if (col) {
      io.to(`board:${col.board_id}`).emit('card_added', card);
    }
  });

  socket.on('move_card', (data) => {
    const { card_id, target_column_id, position } = data;
    queries.moveCard.run(target_column_id, position, card_id);
    const card = queries.getCardById.get(card_id);

    const col = db.prepare('SELECT board_id FROM board_columns WHERE id = ?').get(target_column_id);
    if (col) {
      io.to(`board:${col.board_id}`).emit('card_moved', { card_id, target_column_id, position });
    }
  });

  socket.on('add_comment', (data) => {
    const { card_id, content, author_name } = data;
    const result = queries.createComment.run(card_id, content, author_name);
    const comment = queries.getCommentById.get(result.lastInsertRowid);

    const card = queries.getCardById.get(card_id);
    if (card) {
      const col = db.prepare('SELECT board_id FROM board_columns WHERE id = ?').get(card.column_id);
      if (col) {
        io.to(`board:${col.board_id}`).emit('comment_added', { ...comment, card_id });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
