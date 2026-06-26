const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const repo = require('./db/repository');
const boardsRouter = require('./routes/boards');
const exportRouter = require('./routes/export');
const registerSocketHandlers = require('./sockets');

const PORT = Number(process.env.PORT) || 4000;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/boards', boardsRouter);
app.use('/api/boards', exportRouter); // /api/boards/:id/export

// Serve the built React client in production.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|socket\.io).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});
app.set('io', io);
registerSocketHandlers(io, repo);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Retro board server listening on http://localhost:${PORT}`);
});
