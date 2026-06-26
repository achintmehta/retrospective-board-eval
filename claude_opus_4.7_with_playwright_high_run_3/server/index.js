const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');

require('./db');
const apiRouter = require('./routes');
const { attachSocketHandlers } = require('./sockets');

const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

if (isProd) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api|socket\.io).*/, (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
}

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
});
attachSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
