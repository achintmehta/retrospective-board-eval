import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';

import { initSchema } from './db.js';
import { apiRouter } from './routes.js';
import { registerSocketHandlers } from './sockets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 4000);
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

async function main() {
  await initSchema();

  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: true, credentials: true },
  });

  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', apiRouter(io));

  registerSocketHandlers(io);

  // Serve built client in production (if dist exists)
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`[retro-board] server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
