import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import apiRoutes from './routes.js';
import { attachRealtime } from './realtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api', apiRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);
attachRealtime(server);

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`retro-board server listening on http://localhost:${PORT}`);
});
