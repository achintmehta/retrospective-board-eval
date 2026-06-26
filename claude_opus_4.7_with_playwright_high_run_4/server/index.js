import express from 'express';
import http from 'node:http';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';

import boardsRouter from './routes/boards.js';
import exportRouter from './routes/export.js';
import { attachSocketHandlers } from './sockets/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api', boardsRouter);
app.use('/api', exportRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true }
});
app.set('io', io);
attachSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Retro board server listening on http://localhost:${PORT}`);
});
