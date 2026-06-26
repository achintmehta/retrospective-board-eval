import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import './db.js';
import { createBoardRouter } from './routes/boards.js';
import { createExportRouter } from './routes/export.js';
import { registerSocketHandlers } from './sockets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.use('/api/boards', createBoardRouter());
app.use('/api', createExportRouter());

// 5.1 Socket.io server
const httpServer = createServer(app);
const io = new IOServer(httpServer, {
  cors: IS_PROD ? false : { origin: true },
  serveClient: false
});
registerSocketHandlers(io);

// Serve the built client in production
const CLIENT_DIST = resolve(__dirname, '..', 'client', 'dist');
if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(resolve(CLIENT_DIST, 'index.html'));
  });
} else if (IS_PROD) {
  console.warn(
    `[server] Client bundle missing at ${CLIENT_DIST}. Run "npm run build" to generate it.`
  );
}

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
