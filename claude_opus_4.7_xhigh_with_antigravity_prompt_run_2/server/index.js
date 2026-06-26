import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import routes from './routes.js';
import { registerSocketHandlers } from './sockets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', routes);

// Serve built frontend in production
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true },
});
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`[retro] Server listening on http://localhost:${PORT}`);
});
