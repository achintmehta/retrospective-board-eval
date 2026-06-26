const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const express = require('express');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');

const boardsRouter = require('./routes/boards');
const exportRouter = require('./routes/export');
const registerSocketHandlers = require('./sockets');

const PORT = Number(process.env.PORT) || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: IS_PROD ? 'production' : 'development' });
});

app.use('/api/boards', boardsRouter);
app.use('/api', exportRouter);

// Serve built client in production
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api\/|\/socket\.io\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error('[server] error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: true, credentials: true },
});
app.set('io', io);

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  if (!IS_PROD) {
    console.log('[server] Vite dev server proxies /api and /socket.io to this port');
  }
});

module.exports = { app, httpServer, io };
