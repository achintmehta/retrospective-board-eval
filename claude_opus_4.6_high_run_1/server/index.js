const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const boardRoutes = require('./routes/boards');
const { setupSocket } = require('./socket');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

const db = initDb();

app.use('/api/boards', boardRoutes(db, io));

setupSocket(io, db);

const clientBuild = path.join(__dirname, '..', 'client', 'dist');
const serveIndex = (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
};

app.use(express.static(clientBuild));
app.get('/board/:id', serveIndex);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
