import express from 'express';
import http from 'node:http';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';
import routes from './routes.js';
import { registerSocketHandlers } from './sockets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 4000;
const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true },
});
app.set('io', io);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use('/api', routes);

const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`\n  Retro server ready on http://localhost:${PORT}\n`);
});
