import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { initDb, createCard, moveCard, createComment, getCardsByColumnId } from './db';
import { v4 as uuidv4 } from 'uuid';
import apiRouter from './routes';

const app = express();
const httpServer = createServer(app);

// ─── Socket.io (Task 5.1) ─────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// ─── Express Middleware ───────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
}));
app.use(express.json());

// ─── API Routes (Tasks 3.1–3.4, 7.1) ─────────────────────────────────────────
app.use('/api', apiRouter);

// ─── Serve Frontend in Production ────────────────────────────────────────────
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// ─── Socket.io Rooms & Events (Tasks 5.2–5.5) ────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  // Task 5.2 — Room joining
  socket.on('join_board', (boardId: string) => {
    socket.join(`board:${boardId}`);
    console.log(`[socket] ${socket.id} joined board:${boardId}`);
  });

  socket.on('leave_board', (boardId: string) => {
    socket.leave(`board:${boardId}`);
  });

  // Task 5.3 — add_card
  socket.on('add_card', (payload: { boardId: string; columnId: string; content: string; authorName: string }) => {
    try {
      const { boardId, columnId, content, authorName } = payload;
      const existingCards = getCardsByColumnId(columnId);
      const position = existingCards.length;
      const card = createCard(uuidv4(), columnId, content, authorName, position);
      io.to(`board:${boardId}`).emit('card_added', card);
    } catch (err) {
      console.error('[socket] add_card error:', err);
      socket.emit('error', { message: 'Failed to add card' });
    }
  });

  // Task 5.4 — move_card
  socket.on('move_card', (payload: { boardId: string; cardId: string; newColumnId: string; newPosition: number }) => {
    try {
      const { boardId, cardId, newColumnId, newPosition } = payload;
      moveCard(cardId, newColumnId, newPosition);
      io.to(`board:${boardId}`).emit('card_moved', { cardId, newColumnId, newPosition });
    } catch (err) {
      console.error('[socket] move_card error:', err);
      socket.emit('error', { message: 'Failed to move card' });
    }
  });

  // Task 5.5 — add_comment
  socket.on('add_comment', (payload: { boardId: string; cardId: string; content: string; authorName: string }) => {
    try {
      const { boardId, cardId, content, authorName } = payload;
      const comment = createComment(uuidv4(), cardId, content, authorName);
      io.to(`board:${boardId}`).emit('comment_added', comment);
    } catch (err) {
      console.error('[socket] add_comment error:', err);
      socket.emit('error', { message: 'Failed to add comment' });
    }
  });

  // add_column via socket too for real-time broadcast
  socket.on('add_column', (payload: { boardId: string; column: { id: string; board_id: string; title: string; position: number } }) => {
    io.to(`board:${payload.boardId}`).emit('column_added', payload.column);
  });

  socket.on('disconnect', () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);

async function start() {
  await initDb();
  httpServer.listen(PORT, () => {
    console.log(`🚀 Retro Board server running at http://localhost:${PORT}`);
  });
}

start().catch(console.error);
