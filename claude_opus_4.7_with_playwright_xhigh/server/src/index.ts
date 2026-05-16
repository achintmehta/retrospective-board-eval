import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { Server as SocketIoServer } from 'socket.io';

import { initDb } from './db.js';
import { buildRouter } from './routes.js';
import { registerSocketHandlers } from './sockets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await initDb();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  app.use('/api', buildRouter());

  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error('[server]', err);
      res.status(500).json({ error: 'internal server error' });
    }
  );

  const server = http.createServer(app);
  const io = new SocketIoServer(server, {
    cors: { origin: true, credentials: true },
  });
  registerSocketHandlers(io);

  const port = Number(process.env.PORT ?? 3001);
  server.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
