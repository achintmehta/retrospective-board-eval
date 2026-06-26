# Retro Board

A real-time collaborative retrospective board for agile teams. Built with Node.js, Express, React, Socket.io, and SQLite.

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement", "Action Items")
- Real-time card creation and drag-and-drop movement
- Nested comments on cards
- Guest authentication via display name
- Export board data to CSV
- Single Docker container deployment

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Development

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Start the backend server (port 3000)
npm run dev

# In a separate terminal, start the frontend dev server (port 5173)
npm run client:dev
```

Visit `http://localhost:5173` for the development frontend (with hot reload and API proxy to port 3000).

### Production

```bash
# Build the frontend
npm run client:build

# Start the server (serves both API and static frontend)
npm start
```

Visit `http://localhost:3000`.

### Docker

```bash
# Build the image
docker build -t retro-board .

# Run with persistent data
docker run -p 3000:3000 -v retro-data:/app/data retro-board
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DB_PATH` | `./data/retro.sqlite` | SQLite database file path |

## API Documentation

See [docs/API.md](docs/API.md) for the full REST API reference.

## Frontend Documentation

See [docs/FRONTEND.md](docs/FRONTEND.md) for frontend architecture details.
