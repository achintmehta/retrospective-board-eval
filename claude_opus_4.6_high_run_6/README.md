# Retrospective Board

A real-time collaborative retrospective board for teams. Create boards, add columns, post cards, drag-and-drop between columns, and comment — all synchronized live across all connected users.

## Quick Start

### Prerequisites

- Node.js 18+

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts the Express backend on port 3000 and the Vite dev server on port 5173. Open http://localhost:5173.

### Production

```bash
npm start
```

Builds the frontend and serves everything from port 3000.

### Docker

```bash
docker build -t retro-board .
docker run -p 3000:3000 -v retro-data:/app retro-board
```

Open http://localhost:3000.

## Features

- **Board Management** — Create boards and add custom columns (e.g., "Went Well", "Needs Improvement")
- **Real-Time Collaboration** — Cards and comments sync instantly via WebSockets
- **Drag & Drop** — Move cards between columns with drag-and-drop
- **Nested Comments** — Discuss individual cards with threaded comments
- **Guest Auth** — No sign-up required, just enter a display name
- **CSV Export** — Download board data as a CSV file
- **SQLite Storage** — Zero-config database, persisted to a single file

## Tech Stack

- **Backend:** Node.js, Express, Socket.io, better-sqlite3
- **Frontend:** React (Vite), React Router, @hello-pangea/dnd, socket.io-client
- **Database:** SQLite with WAL mode
