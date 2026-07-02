import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes.js';
import { attachSockets } from './socket.js';
import './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3001;
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api', apiRouter());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (isProduction) {
  const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api\/|\/socket\.io\/).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    console.warn(`[server] client/dist not found at ${clientDist} — static serving disabled.`);
  }
}

const httpServer = http.createServer(app);
attachSockets(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT} (${isProduction ? 'production' : 'development'})`);
});
