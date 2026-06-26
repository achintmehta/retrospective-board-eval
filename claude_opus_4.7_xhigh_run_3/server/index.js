import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { buildRouter } from './routes.js';
import { registerSocketHandlers } from './sockets.js';

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_DIST = resolve(process.cwd(), 'client', 'dist');
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', buildRouter());

if (IS_PROD && existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(resolve(CLIENT_DIST, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'server_error' });
});

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: IS_PROD ? undefined : { origin: '*' },
});
registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Retro server listening on http://localhost:${PORT}`);
});
