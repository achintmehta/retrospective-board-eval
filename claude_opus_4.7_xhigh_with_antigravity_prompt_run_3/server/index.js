import http from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import apiRouter from './routes.js';
import { registerSocketHandlers } from './sockets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 4000);
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => res.json({ ok: true, mode: isProd ? 'production' : 'development' }));
app.use('/api', apiRouter);

// In production we serve the built React bundle directly from this process,
// so the whole app is a single Node container with no extra proxy needed.
const clientDist = resolve(__dirname, '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: isProd ? '1y' : 0 }));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
} else if (isProd) {
  console.warn('[retro] No client build found at', clientDist, '— run `npm run build` first.');
}

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true },
  // Tolerate small network blips before treating the client as disconnected.
  pingTimeout: 20000,
});
app.set('io', io);
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`[retro] listening on http://localhost:${PORT}`);
});

function shutdown(signal) {
  console.log(`\n[retro] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
