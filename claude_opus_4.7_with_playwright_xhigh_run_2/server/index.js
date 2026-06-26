const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');

const { createApiRouter } = require('./routes');
const { registerSocketHandlers } = require('./sockets');

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_DIST = process.env.CLIENT_DIST || path.join(__dirname, '..', 'client', 'dist');

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true },
});

app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api', createApiRouter({ getIo: () => io }));

registerSocketHandlers(io);

// Serve the built React app when it exists.
const indexHtmlPath = path.join(CLIENT_DIST, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/(api|socket\.io)\/).*/, (_req, res) => {
    res.sendFile(indexHtmlPath);
  });
}

// JSON error handler
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[server] error:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message || 'internal server error' });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${PORT}`);
});

module.exports = { app, server, io };
