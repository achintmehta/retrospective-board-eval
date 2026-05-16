import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';

import { initSchema } from './db/schema.js';
import { boardsRouter } from './routes/boards.js';
import { exportRouter } from './routes/export.js';
import { registerBoardSocket } from './sockets/boardSocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');

const PORT = Number(process.env.PORT || 4000);

async function main() {
  await initSchema();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/boards', boardsRouter);
  app.use('/api/boards', exportRouter);

  // In production, serve the built client. In dev, Vite serves the client on
  // its own port and proxies API/socket traffic to us, so this branch is a
  // no-op when client/dist doesn't exist yet.
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use((err, _req, res, _next) => {
    console.error('[server error]', err);
    res.status(500).json({ error: err.message || 'internal error' });
  });

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: true },
  });
  registerBoardSocket(io);

  server.listen(PORT, () => {
    console.log(`[retro] server listening on http://localhost:${PORT}`);
    if (!fs.existsSync(clientDist)) {
      console.log('[retro] client/dist not found — run `npm run dev` to start Vite, or `npm run build` for production');
    }
  });
}

main().catch((err) => {
  console.error('[retro] failed to start:', err);
  process.exit(1);
});
