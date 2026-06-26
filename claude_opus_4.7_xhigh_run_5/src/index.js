import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { Server as SocketServer } from 'socket.io';

import apiRoutes from './routes.js';
import exportRoutes from './export.js';
import { attachSocketHandlers } from './sockets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3001);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', exportRoutes);
app.use('/api', apiRoutes);

const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: true, credentials: true },
});

attachSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Retro board server listening on port ${PORT}`);
});
