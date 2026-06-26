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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_DIST = path.resolve(__dirname, '..', '..', 'client', 'dist');

async function main() {
  await initSchema();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', createApiRouter());

  // Serve built client if available (production / single-container deploy)
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }

  app.use((err, _req, res, _next) => {
    console.error('[error]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: '*' },
  });
  registerSocketHandlers(io);

  server.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    if (fs.existsSync(CLIENT_DIST)) {
      console.log('[server] serving built client from', CLIENT_DIST);
    } else {
      console.log('[server] no built client found — run `npm run build` or use the Vite dev server');
    }
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
