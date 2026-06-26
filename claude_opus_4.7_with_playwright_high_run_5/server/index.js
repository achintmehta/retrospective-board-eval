import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { Server as IOServer } from 'socket.io';

import './db.js';
import apiRouter from './routes.js';
import { registerSocketHandlers } from './sockets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api', apiRouter);
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the built React client in production.
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
if (isProd) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|socket\.io).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new IOServer(server, {
  cors: isProd ? undefined : { origin: '*' },
});
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`[retro-board] server listening on http://localhost:${PORT}`);
});
