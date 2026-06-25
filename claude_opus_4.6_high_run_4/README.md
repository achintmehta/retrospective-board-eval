# Retrospective Board

A real-time collaborative retrospective board for team retrospectives. Built with React, Express, Socket.io, and SQLite.

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement", "Action Items")
- Real-time card creation and movement via WebSockets
- Drag-and-drop cards between columns
- Nested comments on cards
- Guest authentication with display names
- Export board data to CSV
- Single-container Docker deployment

## Quick Start

### Prerequisites

- Node.js 18+

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts the backend on `http://localhost:3001` and the frontend dev server on `http://localhost:5173`.

### Production

```bash
npm start
```

This builds the frontend and serves everything from the Express server on port 3001.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `DB_PATH` | `./retro.sqlite` | SQLite database file path |
