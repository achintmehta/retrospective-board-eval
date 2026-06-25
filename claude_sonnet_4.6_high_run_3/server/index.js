import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  getBoards,
  getBoardById,
  createBoard,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getBoardForExport,
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
}

// --- REST: Boards ---

app.get('/api/boards', (req, res) => {
  res.json(getBoards());
});

app.post('/api/boards', (req, res) => {
  const { title, columns } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const boardId = randomUUID();
  const board = createBoard(boardId, title);

  const defaultColumns = columns?.length
    ? columns
    : ['Went Well', 'Needs Improvement', 'Action Items'];

  defaultColumns.forEach((colTitle, i) => {
    createColumn(randomUUID(), boardId, colTitle, i);
  });

  res.status(201).json(getBoardById(boardId));
});

app.get('/api/boards/:id', (req, res) => {
  const board = getBoardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

app.post('/api/boards/:id/columns', (req, res) => {
  const board = getBoardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const position = board.columns.length;
  const column = createColumn(randomUUID(), req.params.id, title, position);

  io.to(req.params.id).emit('column_added', column);
  res.status(201).json(column);
});

// --- REST: Export ---

app.get('/api/boards/:id/export', (req, res) => {
  const result = getBoardForExport(req.params.id);
  if (!result) return res.status(404).json({ error: 'Board not found' });

  const { board, rows } = result;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${board.title.replace(/[^a-z0-9]/gi, '_')}.csv"`
  );

  const escape = (val) => (val == null ? '' : `"${String(val).replace(/"/g, '""')}"`);

  res.write('Board,Column,Card Content,Card Author,Card Created At,Comment Content,Comment Author,Comment Created At\n');

  if (rows.length === 0) {
    res.end();
    return;
  }

  for (const row of rows) {
    res.write(
      [
        escape(row.board_title),
        escape(row.column_title),
        escape(row.card_content),
        escape(row.card_author),
        escape(row.card_created_at),
        escape(row.comment_content),
        escape(row.comment_author),
        escape(row.comment_created_at),
      ].join(',') + '\n'
    );
  }

  res.end();
});

// Fallback for SPA in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// --- Socket.io ---

io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(boardId);
  });

  socket.on('add_card', ({ boardId, columnId, content, authorName }, callback) => {
    const position = 0;
    const card = createCard(randomUUID(), columnId, content, authorName, position);
    card.comments = [];
    io.to(boardId).emit('card_added', { columnId, card });
    if (callback) callback({ ok: true, card });
  });

  socket.on('move_card', ({ boardId, cardId, newColumnId, newPosition }, callback) => {
    const card = moveCard(cardId, newColumnId, newPosition);
    io.to(boardId).emit('card_moved', { cardId, newColumnId, newPosition });
    if (callback) callback({ ok: true, card });
  });

  socket.on('add_comment', ({ boardId, cardId, content, authorName }, callback) => {
    const comment = createComment(randomUUID(), cardId, content, authorName);
    io.to(boardId).emit('comment_added', { cardId, comment });
    if (callback) callback({ ok: true, comment });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
