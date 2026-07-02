# RetroBoard

A real-time retrospective board for teams. Create boards, add cards, drag-and-drop between columns, and collaborate with comments — all synchronized instantly via WebSockets.

## Quick Start

### Prerequisites

- Node.js 18+

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

The app launches at `http://localhost:5173` (frontend) with the API on port 3001.

### Production

```bash
npm run build
npm start
```

Serves the built frontend and API on `http://localhost:3001`.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

Data persists via the `/app/data` volume.

## Features

- **Board management** — Create boards with custom columns
- **Real-time collaboration** — Cards and comments sync instantly across all clients via Socket.io
- **Drag-and-drop** — Move cards between columns
- **Guest sessions** — Join with just a display name
- **CSV export** — Download board data as a spreadsheet
- **Single-container deployment** — SQLite database, no external dependencies

## Tech Stack

| Layer     | Technology           |
| --------- | -------------------- |
| Frontend  | React, Vite          |
| Backend   | Node.js, Express     |
| Real-time | Socket.io            |
| Database  | SQLite (sql.js)      |
| DnD       | @hello-pangea/dnd    |
