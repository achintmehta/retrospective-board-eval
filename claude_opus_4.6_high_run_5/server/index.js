import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDatabase,
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getBoardExportData,
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  },
});

app.use(cors());
app.use(express.json());

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
}

// REST API Routes

app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const board = createBoard(title.trim());
  res.status(201).json(board);
});

app.get('/api/boards', (_req, res) => {
  const boards = getAllBoards();
  res.json(boards);
});

app.get('/api/boards/:id', (req, res) => {
  const board = getBoardById(Number(req.params.id));
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  res.json(board);
});

app.post('/api/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Column title is required' });
  }
  const column = createColumn(Number(req.params.id), title.trim());
  res.status(201).json(column);
});

app.get('/api/boards/:id/export', (req, res) => {
  const boardId = Number(req.params.id);
  const board = getBoardById(boardId);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const rows = getBoardExportData(boardId);

  const headers = [
    'Column',
    'Card Content',
    'Card Author',
    'Card Created At',
    'Comment',
    'Comment Author',
    'Comment Created At',
  ];

  const escapeCsv = (val) => {
    if (val == null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  let csv = headers.join(',') + '\n';
  for (const row of rows) {
    csv +=
      [
        escapeCsv(row.column_title),
        escapeCsv(row.card_content),
        escapeCsv(row.card_author),
        escapeCsv(row.card_created_at),
        escapeCsv(row.comment_content),
        escapeCsv(row.comment_author),
        escapeCsv(row.comment_created_at),
      ].join(',') + '\n';
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="board-${boardId}-export.csv"`
  );
  res.send(csv);
});

// Catch-all for SPA in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// Socket.io
io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('leave_board', (boardId) => {
    socket.leave(`board:${boardId}`);
  });

  socket.on('add_card', ({ columnId, content, authorName, boardId }) => {
    const card = createCard(columnId, content, authorName);
    card.comments = [];
    io.to(`board:${boardId}`).emit('card_added', { columnId, card });
  });

  socket.on('move_card', ({ cardId, targetColumnId, targetPosition, boardId }) => {
    const card = moveCard(cardId, targetColumnId, targetPosition);
    io.to(`board:${boardId}`).emit('card_moved', {
      cardId,
      sourceColumnId: card.column_id,
      targetColumnId,
      targetPosition,
      card,
    });
  });

  socket.on('add_comment', ({ cardId, content, authorName, boardId }) => {
    const comment = createComment(cardId, content, authorName);
    io.to(`board:${boardId}`).emit('comment_added', { cardId, comment });
  });

  socket.on('add_column', ({ boardId, title }) => {
    const column = createColumn(boardId, title);
    column.cards = [];
    io.to(`board:${boardId}`).emit('column_added', { column });
  });
});

const PORT = process.env.PORT || 3000;

async function start() {
  await initDatabase();
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
