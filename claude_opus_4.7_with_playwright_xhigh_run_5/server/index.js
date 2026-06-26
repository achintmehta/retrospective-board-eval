const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

require('./db');
const { createRouter } = require('./routes');
const { registerSocketHandlers, broadcastToBoard } = require('./sockets');

const PORT = Number(process.env.PORT) || 4000;
const SERVE_CLIENT = process.env.SERVE_CLIENT === 'true';
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

registerSocketHandlers(io);

app.use('/api', createRouter(broadcastToBoard(io)));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

if (SERVE_CLIENT && fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  // SPA fallback: any unknown GET serves index.html so React Router can route.
  app.get(/^\/(?!api|socket\.io).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Retro board server listening on http://localhost:${PORT}`);
});

module.exports = { app, server, io };
