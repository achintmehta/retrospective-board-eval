const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const { setupSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(routes);

setupSocket(server);

const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Retro Board server running on http://localhost:${PORT}`);
});
