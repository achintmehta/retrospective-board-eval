const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const boardsRouter = require('./src/routes/boards');
const { attachSocketHandlers } = require('./src/sockets');

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_DIST = path.join(__dirname, 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/boards', boardsRouter);

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});
app.set('io', io);
attachSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`[retro] server listening on http://localhost:${PORT}`);
});
