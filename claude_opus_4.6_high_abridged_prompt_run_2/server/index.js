import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import { registerRoutes } from './routes.js';
import { registerSocket } from './socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

const db = await initDb();

registerRoutes(app, db);
registerSocket(server, db);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
