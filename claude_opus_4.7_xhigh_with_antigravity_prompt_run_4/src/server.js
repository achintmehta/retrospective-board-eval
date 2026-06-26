import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';

import boardsRouter from './routes/boards.js';
import { attachSocketHandlers } from './sockets.js';
import './db.js'; // initialize schema on boot

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_DIST = path.resolve(__dirname, '..', 'client', 'dist');
const HAS_CLIENT_BUILD = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/boards', boardsRouter);

// Serve the React build in production. In dev, Vite serves the client.
if (HAS_CLIENT_BUILD) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.type('text/plain').send(
      'RetroFlow API is running. Build the client with `npm run build` ' +
        'or start the Vite dev server with `npm run dev`.\n'
    );
  });
}

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: true, credentials: true },
});
app.locals.io = io;
attachSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`[retro-board] API listening on http://localhost:${PORT}`);
  console.log(
    HAS_CLIENT_BUILD
      ? `[retro-board] Serving built client from ${CLIENT_DIST}`
      : `[retro-board] No client build found — run \`npm run dev\` for the Vite dev server.`
  );
});
