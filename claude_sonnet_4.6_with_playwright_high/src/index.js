const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const { initSchema } = require('./db');
const routes = require('./routes');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
}));
app.use(express.json());

// REST API
app.use('/api', routes);

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

initSchema();
initSocket(io);

server.listen(PORT, () => {
  console.log(`Retro Board server running on http://localhost:${PORT}`);
});
