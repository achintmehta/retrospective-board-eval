import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { initializeDatabase } from './db';
import { boardRoutes } from './routes/boards';
import { setupSocketHandlers } from './socket';

const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const db = initializeDatabase();

// API routes
app.use('/api/boards', boardRoutes(db));

// Socket.IO handlers
setupSocketHandlers(io, db);

// Serve static frontend in production
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export { app, server, io };
