import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createRouter } from './routes.js';
import { registerSocketHandlers } from './sockets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_DIST = path.resolve(__dirname, '..', 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', createRouter());

// Serve built client in production
import fs from 'node:fs';
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|socket\.io).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true }
});
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`[retro-board] server listening on http://localhost:${PORT}`);
});
