import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';

import { buildBoardsRouter } from './routes/boards.js';
import { buildExportRouter } from './routes/export.js';
import { attachSocketHandlers } from './sockets.js';

const PORT = Number(process.env.PORT) || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: NODE_ENV });
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});
attachSocketHandlers(io);

app.use('/api/boards', buildBoardsRouter({ io }));
app.use('/api/boards', buildExportRouter());

const STATIC_DIR = path.resolve(process.cwd(), 'client', 'dist');
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
  });
} else if (NODE_ENV !== 'production') {
  app.get('/', (_req, res) => {
    res.type('text/plain').send(
      'Retro Board backend is running.\n' +
        'Frontend dev server lives at http://localhost:5173 (run `npm run dev:client`).\n' +
        'In production, build the client (`npm run build`) so this server serves the static bundle.'
    );
  });
}

server.listen(PORT, () => {
  console.log(`[retro-board] listening on http://localhost:${PORT} (${NODE_ENV})`);
});

function shutdown(signal) {
  console.log(`[retro-board] received ${signal}, shutting down`);
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
