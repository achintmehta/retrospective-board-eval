const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');

const { createRouter } = require('./routes');
const { registerSocketHandlers } = require('./sockets');

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true },
});

app.use('/api', createRouter(io));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve built frontend in production
const fs = require('fs');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|socket\.io).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`[retro-board] listening on http://localhost:${PORT}`);
});
