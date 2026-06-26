const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');

const routes = require('./routes');
const { attachSockets } = require('./sockets');

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_DIST = process.env.CLIENT_DIST || path.join(__dirname, '..', 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api', routes);
app.get('/api/health', (req, res) => res.json({ ok: true }));

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|socket\.io).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true },
});

attachSockets(io);

server.listen(PORT, () => {
  console.log(`[retro-board] listening on http://localhost:${PORT}`);
});

module.exports = { app, server, io };
