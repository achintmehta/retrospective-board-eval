const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const boardRoutes = require('./routes/boards');
const { setupSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));

initDb();

app.use('/api/boards', boardRoutes);

setupSocket(io);

app.get('*splat', (_req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
