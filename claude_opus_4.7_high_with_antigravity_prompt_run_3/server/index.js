import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import './db.js';
import { buildApiRouter } from './api.js';
import { attachRealtime } from './realtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api', buildApiRouter());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|socket\.io).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const httpServer = http.createServer(app);
attachRealtime(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[retro-board] listening on http://localhost:${PORT}`);
});
