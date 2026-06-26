import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildRouter } from './routes.js';
import { attachRealtime } from './realtime.js';
import './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_DIST = path.resolve(__dirname, '..', 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api', buildRouter());

// Serve built client (production). In dev, Vite proxies /api & /socket.io to us.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

const httpServer = http.createServer(app);
attachRealtime(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Retro Board server listening on http://localhost:${PORT}`);
});
