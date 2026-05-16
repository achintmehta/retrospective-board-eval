import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import './db.js';
import { createApiRouter } from './routes.js';
import { attachSocket } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '256kb' }));

const server = http.createServer(app);
const io = attachSocket(server);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: Date.now() });
});
app.use('/api', createApiRouter({ io }));

// Serve built static frontend if present (production / single-container).
const clientDist = resolve(__dirname, '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback — anything not under /api or /socket.io returns the SPA shell.
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

server.listen(PORT, HOST, () => {
  console.log(`[retro] listening on http://${HOST}:${PORT}`);
  if (existsSync(clientDist)) {
    console.log(`[retro] serving built client from ${clientDist}`);
  } else {
    console.log('[retro] no built client found — run `npm run dev:client` for the dev server');
  }
});

const shutdown = (signal) => {
  console.log(`[retro] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
