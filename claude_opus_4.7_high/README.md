# Retro Board

A self-hosted, real-time retrospective board. A Node.js + Express backend with
WebSocket synchronisation (Socket.io) serves a React + Vite frontend, persisting
all data in a single SQLite file. Designed to run locally or as one Docker
container — no external services required.

## Features

- Create multiple retrospective boards.
- Each board has configurable columns (defaults: *Went Well*, *Needs Improvement*, *Action Items*).
- Add cards to columns and drag-and-drop them between columns in real time.
- Add nested comments to any card.
- Real-time sync across all connected clients via WebSockets.
- Frictionless guest sessions — just enter a display name to join.
- Export an entire board (columns, cards, comments) to CSV.

## Quick start (local development)

Requires Node.js 22.5 or later (uses the built-in `node:sqlite` module — no native SQLite driver to compile). Node.js 24 is recommended.

```bash
# Install backend and client deps
npm run install:all

# Start backend (port 4000) and Vite dev server (port 5173) together
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies API and Socket.io
requests to the backend on port 4000.

## Production build

```bash
npm run install:all
npm run build      # builds both client and server
npm start          # serves API + built client on PORT (default 4000)
```

In production, the backend serves the built client from `client/dist/`, so a
single port hosts the entire app.

## Docker

The included `Dockerfile` produces a single self-contained image.

```bash
docker build -t retro-board .

# Map a host directory to /data so the SQLite file persists across restarts.
docker run --rm -p 4000:4000 -v $(pwd)/data:/data retro-board
```

Then visit http://localhost:4000.

Environment variables:

| Variable | Default        | Description                              |
|----------|----------------|------------------------------------------|
| `PORT`   | `4000`         | HTTP port                                |
| `DB_DIR` | `./data`       | Directory holding `retro.sqlite`         |
| `DB_FILE`| `$DB_DIR/retro.sqlite` | Full path to the SQLite file     |

## Documentation

- [API reference](docs/api.md)
- [Frontend overview](docs/frontend.md)

## Project layout

```
.
├── src/                  Backend (TypeScript, Express, Socket.io)
│   ├── index.ts          Entry point — wires HTTP, WebSocket, static client
│   ├── db.ts             SQLite connection + schema
│   ├── repository.ts     All DB queries / mutations
│   ├── routes/boards.ts  REST API
│   └── sockets/handlers.ts  WebSocket event handlers
├── client/               Frontend (Vite + React + TypeScript)
│   └── src/
│       ├── pages/        MainPage, BoardPage
│       ├── components/   Column, CardItem, GuestNameModal
│       ├── api.ts        REST helpers
│       └── socket.ts     Socket.io client singleton
├── Dockerfile
└── docs/
```
