const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const boardRoutes = require('./routes/boards');
const exportRoutes = require('./routes/export');
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

initDb();

app.use('/api/boards', boardRoutes);
app.use('/api/boards', exportRoutes);

const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

setupSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
