import express from 'express';
import http from 'node:http';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';

import { createRouter } from './routes.js';
import { attachSockets } from './sockets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '..', 'client', 'dist');
const PORT = Number(process.env.PORT || 4000);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '256kb' }));
app.use('/api', createRouter(io));

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res
      .status(200)
      .type('text/plain')
      .send(
        'Retro backend running. Client build not found. Start Vite with `npm run dev:client` or run `npm run build`.',
      );
  });
}

attachSockets(io);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
  console.log(`Retro server listening on http://localhost:${PORT}`);
});
