const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db');
const boardRoutes = require('./routes/boards');
const exportRoutes = require('./routes/export');
const { setupSocketHandlers } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const db = initializeDatabase();

app.use('/api/boards', boardRoutes(db));
app.use('/api/boards', exportRoutes(db));

setupSocketHandlers(io, db);

const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
