import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server as SocketServer } from 'socket.io';

import './db/index.js'; // ensures schema initialization at boot
import { boardsRouter } from './routes/boards.js';
import { registerSocketHandlers } from './realtime/socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 4000);
const NODE_ENV = process.env.NODE_ENV ?? 'development';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: NODE_ENV === 'production' ? undefined : { origin: '*' },
});

app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '1.0.0' });
});

app.use('/api/boards', boardsRouter(io));

// Serve built client in production. In dev the Vite dev server proxies
// /api and /socket.io to us, so no static hosting needed.
const clientDist = path.resolve(__dirname, '../../client/dist');
if (NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

registerSocketHandlers(io);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[retro] listening on http://localhost:${PORT} (${NODE_ENV})`);
});
