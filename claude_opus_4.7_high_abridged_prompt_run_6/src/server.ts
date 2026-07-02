import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { api } from './routes.js';
import { registerSocketHandlers } from './sockets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', api);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const clientDist = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
});
registerSocketHandlers(io);

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => {

  console.log(`[retro] server listening on http://localhost:${PORT}`);
});
