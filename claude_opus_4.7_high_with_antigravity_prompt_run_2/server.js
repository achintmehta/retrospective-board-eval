const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { buildRouter } = require('./server/routes');
const { attachSockets } = require('./server/sockets');

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_DIST = path.join(__dirname, 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.use('/api', buildRouter());

// Serve the built React client when available (production / Docker).
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.type('text/plain').send(
      'Retro API server is running. Start the Vite dev server with `npm run client` (or `npm run dev` to run both).',
    );
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});
attachSockets(io);

server.listen(PORT, () => {
  console.log(`[retro] server listening on http://localhost:${PORT}`);
});
