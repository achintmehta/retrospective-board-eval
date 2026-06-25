# Retrospective Board

A real-time retrospective board application for teams. Create boards, add cards, drag-and-drop between columns, and collaborate in real-time with WebSocket synchronization.

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement")
- Real-time card and comment synchronization via WebSockets
- Drag-and-drop cards between columns
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

This starts both the backend (port 3000) and frontend dev server (port 5173).

### Production

```bash
npm start
```

This builds the frontend and starts the server on port 3000.

### Docker

```bash
docker build -t retro-board .
docker run -p 3000:3000 -v retro-data:/data retro-board
```

## Architecture

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: React (Vite) + @hello-pangea/dnd
- **Database**: SQLite (via better-sqlite3)
- **Real-time**: Socket.io for WebSocket communication
