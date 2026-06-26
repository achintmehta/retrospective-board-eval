# Retro Board

A real-time retrospective board application for team collaboration. Built with Node.js, Express, React, Socket.io, and SQLite.

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement")
- Real-time card creation and drag-and-drop between columns
- Nested comments on cards
- Guest authentication via display name
- Export board data to CSV
- Single-container Docker deployment

## Quick Start

### Prerequisites

- Node.js 18+ installed

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts:
- Backend API server on `http://localhost:3001`
- Frontend dev server on `http://localhost:5173`

### Production

```bash
npm start
```

This builds the frontend and serves everything from `http://localhost:3001`.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

The SQLite database is stored in `/app/data` inside the container. Mount a volume to persist data across container restarts.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3001`  | Server port |

## Tech Stack

- **Backend:** Node.js, Express 5, Socket.io, better-sqlite3
- **Frontend:** React 19, Vite, React Router, dnd-kit
- **Database:** SQLite (WAL mode)
