const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { initializeSchema } = require('./schema');
const { initializeSocket } = require('./socket');
const routes = require('./routes');

initializeSchema();

const app = express();
const server = http.createServer(app);

initializeSocket(server);

app.use(cors());
app.use(express.json());

app.use('/api', routes);

const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));

app.get('{*splat}', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };
