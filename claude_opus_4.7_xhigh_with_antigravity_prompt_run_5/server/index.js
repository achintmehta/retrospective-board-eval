const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');

const apiRouter = require('./routes');
const { attachSockets } = require('./sockets');

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api', apiRouter);

app.get('/healthz', (_req, res) => res.json({ ok: true }));

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api\/|\/socket\.io\/).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  console.log('[server] client/dist not found — running API-only mode (use Vite dev server for UI)');
}

const httpServer = http.createServer(app);
const io = attachSockets(httpServer);
app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
