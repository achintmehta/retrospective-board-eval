# Retro Board

A self-hosted, real-time retrospective board built with Node.js, Express,
Socket.io, React (Vite), and SQLite. Designed to run locally or as a single
Docker container — no external services required.

## Features

- Create and list retrospective boards
- Configurable columns per board (defaults: Went Well / Needs Improvement / Action Items)
- Add cards to columns with drag-and-drop reordering between columns
- Nested comments on cards
- Real-time multi-user collaboration via WebSockets
- Guest "display name" sessions — no signup required
- Export an entire board to CSV

## Requirements

- Node.js 20+
- npm 9+
- (Optional) Docker 24+ for containerized deployment

## Local development

Install all dependencies (root + client):

```bash
npm run install:all
```

Start the backend and frontend together:

```bash
npm run dev
```

This runs:

- Express + Socket.io API on `http://localhost:3001`
- Vite dev server on `http://localhost:5173` (proxies `/api` and `/socket.io` to the backend)

Open `http://localhost:5173` in your browser. SQLite data is written to `./data/retro.sqlite`.

## Production build (without Docker)

```bash
npm run install:all
npm run build
npm start
```

The built client is served from the same Express process on `http://localhost:3001`.

## Docker

Build and run a single self-contained container. The SQLite file lives at
`/data/retro.sqlite` inside the container — mount a volume to persist it.

```bash
docker build -t retro-board .
docker run --rm -p 3001:3001 -v retro-data:/data retro-board
```

Then open `http://localhost:3001`.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | HTTP port the backend listens on |
| `DATA_DIR` | `./data` (or `/data` in Docker) | Directory the SQLite file is written to |

## Project layout

```
.
├── server/             # Express + Socket.io backend (TypeScript)
│   └── src/
├── client/             # Vite + React frontend (TypeScript)
│   └── src/
├── docs/
│   ├── api.md          # REST + WebSocket API reference
│   └── frontend.md     # Frontend architecture
├── Dockerfile
└── README.md
```

See `docs/api.md` and `docs/frontend.md` for deeper documentation.
