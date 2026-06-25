# Retrospective Board

A real-time collaborative retrospective board for teams. Built with Node.js, Express, React, Socket.io, and SQLite.

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement", "Action Items")
- Add cards to columns with real-time sync across all connected users
- Drag and drop cards between columns
- Nested comments on cards
- Guest authentication via display name
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

This starts both the backend (port 3001) and frontend dev server (port 5173). Open http://localhost:5173 in your browser.

### Production

```bash
npm run build
npm start
```

The app serves on port 3001.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

Open http://localhost:3001.

## Data

SQLite database is stored at `data/retro.sqlite`. Mount `/app/data` as a Docker volume for persistence.
