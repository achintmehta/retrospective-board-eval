import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { initDb } from './db.js';
import { boardsRouter } from './routes/boards.js';
import { registerSocketHandlers } from './sockets/handlers.js';

initDb();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', boardsRouter);

// Serve built client when present
const CLIENT_DIST = path.resolve(process.cwd(), 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

registerSocketHandlers(io);

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[retro-board] server listening on http://localhost:${PORT}`);
});
