const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const db = require('./db');
const boardsRouter = require('./routes/boards');
const { registerSocketHandlers } = require('./socket/handlers');

const app = express();
const server = http.createServer(app);

const isProd = process.env.NODE_ENV === 'production';

const io = new Server(server, {
  cors: isProd ? false : { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

if (!isProd) {
  app.use(cors({ origin: 'http://localhost:5173' }));
}

app.use(express.json());
app.use('/api/boards', boardsRouter);

if (isProd) {
  const staticPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(staticPath));
  app.get('*', (_req, res) => res.sendFile(path.join(staticPath, 'index.html')));
}

registerSocketHandlers(io);

const PORT = process.env.PORT || 3001;

db.init().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
