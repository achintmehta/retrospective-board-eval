import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import routes from './routes.js';
import { attachSockets } from './sockets.js';
import './db.js'; // ensure schema exists at boot

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api', routes);

// Serve built frontend in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api\/|\/socket\.io\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Central error handler
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const httpServer = http.createServer(app);
const io = attachSockets(httpServer);
app.locals.io = io;

httpServer.listen(PORT, () => {
  console.log(`[retro] listening on http://localhost:${PORT}`);
});

const shutdown = () => {
  console.log('[retro] shutting down');
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
