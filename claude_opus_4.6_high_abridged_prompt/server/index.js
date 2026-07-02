import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import { registerRoutes } from './routes.js';
import { registerSocketHandlers } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  app.use(cors());
  app.use(express.json());

  const db = await initDb();

  registerRoutes(app, db);
  registerSocketHandlers(io, db);

  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '..', 'client', 'dist');
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
