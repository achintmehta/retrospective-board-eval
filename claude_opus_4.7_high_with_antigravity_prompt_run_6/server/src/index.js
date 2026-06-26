import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';

import { initSchema } from './db.js';
import { createApiRouter } from './routes.js';
import { registerSocketHandlers } from './sockets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_DIST =
  process.env.CLIENT_DIST || path.join(__dirname, '..', '..', 'client', 'dist');

initSchema();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', createApiRouter());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Serve built client if available (production / Docker)
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
});
registerSocketHandlers(io);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[retro-board] listening on http://localhost:${PORT}`);
});
