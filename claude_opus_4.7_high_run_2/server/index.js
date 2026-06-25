const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { createRouter } = require('./routes');
const { registerSocketHandlers } = require('./sockets');

const PORT = process.env.PORT || 3001;
const app = express();

app.use(cors());
app.use(express.json({ limit: '256kb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true },
});

app.use('/api', createRouter(io));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Serve built frontend in production / from prebuilt dist
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

registerSocketHandlers(io);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[retro-board] server listening on http://localhost:${PORT}`);
});
