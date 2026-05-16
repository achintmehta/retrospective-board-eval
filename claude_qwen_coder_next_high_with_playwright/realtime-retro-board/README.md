# Realtime Retro Board

A real-time retrospective board application with WebSocket collaboration.

## Features

- Create and manage retrospective boards
- Real-time card management with drag-and-drop support
- Add and view comments on cards
- Export board data to CSV
- Single-container Docker deployment

## Prerequisites

- Node.js 20+
- npm or yarn

## Development

```bash
# Install dependencies
cd realtime-retro-board
npm install

# Start backend and frontend in development mode
npm run dev
```

The application will be available at `http://localhost:3000` (backend) and `http://localhost:5173` (frontend).

## Production Build

```bash
# Build both backend and frontend
npm run build

# Preview the production build
npm run preview
```

## Docker Deployment

```bash
# Build the Docker image
docker build -t retro-board .

# Run the container
docker run -p 3000:3000 retro-board
```

## Database

SQLite is used as the database. The database file (`retro.db`) is stored in the `data/` directory and persists across restarts.
