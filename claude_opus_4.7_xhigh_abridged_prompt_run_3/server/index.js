import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';

import routes from './routes.js';
import { attachRealtime } from './realtime.js';
import { DB_FILE } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '4000', 10);
const CLIENT_DIST = path.resolve(__dirname, '..', 'client', 'dist');

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api', routes);

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api\/|socket\.io\/).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[server] error:', err);
  res.status(500).json({ error: 'internal server error' });
});

const server = http.createServer(app);
attachRealtime(server);

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] sqlite database: ${DB_FILE}`);
  if (fs.existsSync(CLIENT_DIST)) {
    console.log('[server] serving client bundle from', CLIENT_DIST);
  } else {
    console.log('[server] client bundle not built — run `npm --prefix client run build` for production');
  }
});
