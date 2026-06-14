# Retro Board

A real-time, self-hosted retrospective board application for team retrospectives.

## Features

- Create retrospective boards with configurable columns
- Add cards to columns and move them between columns via drag-and-drop
- Add comments to cards
- Real-time synchronization across all connected clients using WebSockets
- Guest authentication via display name
- Export board data to CSV
- SQLite database for trivial setup

## Prerequisites

- Node.js 18+ and npm

## Quick Start

```bash
# Install dependencies
npm install

# Start both backend and frontend in development mode
npm run dev
```

The frontend will be available at http://localhost:3000 and the backend API at http://localhost:3001.

## Production Build

```bash
# Build the frontend
npm run build

# Start the server (serves both API and built frontend)
npm start
```

## Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/db retro-board
```

## Project Structure

```
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── pages/       # Route components
│   │   ├── App.jsx      # Router setup
│   │   └── App.css      # Global styles
│   └── index.html
├── db/                  # SQLite database setup and utilities
├── routes/              # Express API routes
├── server.js            # Express + Socket.io server
├── Dockerfile           # Single-container deployment
└── package.json
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Backend server port |
| VITE_API_URL | http://localhost:3001/api | Backend API URL |
| VITE_SOCKET_URL | http://localhost:3001 | WebSocket server URL |
