# Realtime Retro Board

A self-hosted, real-time retrospective board. Built with **Node.js + Express**, **Socket.io**, **SQLite**, and **React (Vite)**. Designed to run locally or as a single self-contained Docker container — no external database, no `docker-compose`.

> **Requires Node.js ≥ 22.5.** SQLite is provided by Node's built-in `node:sqlite` module — there is no native build step, no C++ toolchain to install. On Node 22.5–23.x you may need to pass `--experimental-sqlite` (see [API docs](./docs/api.md)). Node 24+ works out of the box.

## Features

- Create and view multiple boards
- Default columns (`Went Well`, `Needs Improvement`, `Action Items`) plus custom columns
- Add cards, drag-and-drop cards between columns
- Nested comments on cards
- Real-time sync across all connected clients via WebSockets
- Guest sessions (just enter a display name)
- Export full board to CSV

## Quick start (local development)

```bash
# install backend + frontend deps
npm run install:all

# start backend (3001) and Vite dev server (5173) together
npm run dev
```

Then open <http://localhost:5173>.

The Vite dev server proxies `/api` and `/socket.io` to the backend on `:3001`, so you only need one URL during development.

## Production (single Node process)

```bash
npm run install:all
npm run build     # builds the React app into client/dist
npm start         # serves API + static frontend on http://localhost:3001
```

## Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v $(pwd)/data:/data retro-board
```

The SQLite database lives in `/data/retro.sqlite` inside the container — mount a volume to persist it across restarts.

## Configuration

| Env var    | Default        | Description                          |
| ---------- | -------------- | ------------------------------------ |
| `PORT`     | `3001`         | HTTP port for the server             |
| `DATA_DIR` | `./data`       | Directory where SQLite file is stored |

## Project layout

```
.
├── server/        # Express + Socket.io backend
│   ├── index.js       # entry point (HTTP + WS + static)
│   ├── routes.js      # REST endpoints + CSV export
│   ├── sockets.js     # real-time event handlers
│   ├── repository.js  # SQLite data access
│   └── db.js          # SQLite connection + schema
├── client/        # React (Vite) frontend
│   └── src/
│       ├── pages/        # MainPage, BoardPage
│       ├── components/   # Column, Card, GuestAuthModal
│       ├── api.js        # REST client
│       └── socket.js     # socket.io-client singleton
├── docs/
│   ├── api.md         # REST + WebSocket API reference
│   └── frontend.md    # Frontend architecture
├── Dockerfile
└── package.json
```

## Documentation

- [API reference](./docs/api.md)
- [Frontend architecture](./docs/frontend.md)
