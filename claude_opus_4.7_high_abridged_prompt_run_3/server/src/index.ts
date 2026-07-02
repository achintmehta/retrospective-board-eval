import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import cors from 'cors';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';

import './db.js';
import { boardsRouter } from './routes/boards.js';
import { exportRouter } from './routes/export.js';
import { registerBoardSocket } from './sockets/board-socket.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api/boards', boardsRouter);
app.use('/api/boards', exportRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDir =
  process.env.STATIC_DIR ??
  path.resolve(__dirname, '..', '..', 'client', 'dist');

if (existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
});
registerBoardSocket(io);

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  console.log(`[retro] server listening on http://localhost:${port}`);
});
