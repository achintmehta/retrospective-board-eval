import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import {
  initDb, createBoard, getAllBoards, getBoard,
  createColumn, getMaxColumnPosition,
  createCard, getMaxCardPosition, moveCard,
  createComment, getBoardForExport,
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const clientDist = join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));

function uid() { return crypto.randomUUID(); }

function rowsToObjects(result) {
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
}

// REST: Create board
app.post('/api/boards', (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  const id = uid();
  createBoard(id, title.trim());
  res.status(201).json({ id, title: title.trim() });
});

// REST: Get all boards
app.get('/api/boards', (_req, res) => {
  const result = getAllBoards();
  res.json(rowsToObjects(result));
});

// REST: Get single board with columns, cards, comments
app.get('/api/boards/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

// REST: Create column
app.post('/api/boards/:id/columns', (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  const position = getMaxColumnPosition(req.params.id) + 1;
  const id = uid();
  createColumn(id, req.params.id, title.trim(), position);
  const col = { id, board_id: req.params.id, title: title.trim(), position, cards: [] };
  io.to(req.params.id).emit('column_added', col);
  res.status(201).json(col);
});

// REST: Export board to CSV
app.get('/api/boards/:id/export', (req, res) => {
  const board = getBoardForExport(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const rows = [['Column', 'Card', 'Author', 'Created At', 'Comment', 'Comment Author', 'Comment Date']];
  for (const col of board.columns) {
    if (!col.cards.length) {
      rows.push([col.title, '', '', '', '', '', '']);
    }
    for (const card of col.cards) {
      if (!card.comments.length) {
        rows.push([col.title, card.content, card.author_name, card.created_at, '', '', '']);
      }
      for (const cmt of card.comments) {
        rows.push([col.title, card.content, card.author_name, card.created_at, cmt.content, cmt.author_name, cmt.created_at]);
      }
    }
  }

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${board.title.replace(/[^a-z0-9]/gi, '_')}_export.csv"`);
  res.send(csv);
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

// Socket.io
io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(boardId);
  });

  socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
    const position = getMaxCardPosition(columnId) + 1;
    const id = uid();
    createCard(id, columnId, content, authorName, position);
    const card = { id, column_id: columnId, content, author_name: authorName, created_at: new Date().toISOString(), position, comments: [] };
    io.to(boardId).emit('card_added', card);
  });

  socket.on('move_card', ({ boardId, cardId, newColumnId, newPosition }) => {
    moveCard(cardId, newColumnId, newPosition);
    io.to(boardId).emit('card_moved', { cardId, newColumnId, newPosition });
  });

  socket.on('add_comment', ({ boardId, cardId, content, authorName }) => {
    const id = uid();
    createComment(id, cardId, content, authorName);
    const comment = { id, card_id: cardId, content, author_name: authorName, created_at: new Date().toISOString() };
    io.to(boardId).emit('comment_added', comment);
  });
});

const PORT = process.env.PORT || 3001;

initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
