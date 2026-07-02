import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { api } from './routes.js';
import { initRealtime } from './realtime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '128kb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api', api);

// Serve the built client if it exists (production/single-container mode).
const clientDir = resolve(
  process.env.CLIENT_DIR || join(__dirname, '../../client/dist'),
);
if (existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(join(clientDir, 'index.html'));
  });
}

const server = createServer(app);
initRealtime(server);

const port = Number(process.env.PORT || 4000);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[retro] server listening on http://localhost:${port}`);
});
