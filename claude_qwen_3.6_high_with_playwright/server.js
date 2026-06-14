import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import boardRoutes from './routes/boards.js';
import { initDb, cardCreate, cardUpdatePosition, commentCreate, cardById, columnsByBoard } from './db/index.js';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/api/boards', boardRoutes);

// Serve built frontend in production
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
if (existsSync(join(__dirname, 'dist'))) {
  app.use(express.static(join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

// Socket.io room-joining and real-time events
const boardSockets = new Map();

io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(`board:${boardId}`);
    if (!boardSockets.has(boardId)) boardSockets.set(boardId, new Set());
    boardSockets.get(boardId).add(socket.id);
  });

  socket.on('add_card', async (data) => {
    try {
      const { columnId, content, authorName, position } = data;
      const card = await cardCreate(columnId, content, authorName, position ?? 0);
      io.to(`board:${data.boardId}`).emit('card_added', card);
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('move_card', async (data) => {
    try {
      const { cardId, columnId, position } = data;
      await cardUpdatePosition(cardId, position, columnId);
      const card = await cardById(cardId);
      if (card) {
        io.to(`board:${data.boardId}`).emit('card_moved', { ...card, column_id: columnId, position });
      }
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('add_comment', async (data) => {
    try {
      const { cardId, content, authorName } = data;
      const comment = await commentCreate(cardId, content, authorName);
      io.to(`board:${data.boardId}`).emit('comment_added', comment);
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('disconnect', () => {
    for (const [boardId, sockets] of boardSockets) {
      sockets.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;

initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
