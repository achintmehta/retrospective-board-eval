import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import './db.js';
import { apiRouter } from './routes.js';
import { registerSocketHandlers, broadcastColumnAdded } from './sockets.js';
import { createColumn } from './repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_DIR =
  process.env.CLIENT_DIR ?? path.resolve(__dirname, '../../client/dist');

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Intercept column creation to broadcast after successful insert
app.post('/api/boards/:id/columns', (req, res, next) => {
  const title = String(req.body?.title ?? '').trim();
  const accent = String(req.body?.accent ?? 'violet').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const column = createColumn(req.params.id, title, accent);
  if (!column) return res.status(404).json({ error: 'board not found' });
  broadcastColumnAdded(io, req.params.id, column);
  res.status(201).json(column);
});

app.use('/api', apiRouter);

// Serve built client in production
if (existsSync(CLIENT_DIR)) {
  app.use(express.static(CLIENT_DIR));
  app.get(/^(?!\/(api|socket\.io)\/).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIR, 'index.html'));
  });
  console.log(`[server] Serving static client from ${CLIENT_DIR}`);
} else {
  console.log(
    `[server] No client build found at ${CLIENT_DIR} — running API-only mode`
  );
}

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
