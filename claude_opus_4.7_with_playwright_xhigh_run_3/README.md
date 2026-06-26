# 🪞 Realtime Retro Board

A self-hosted, real-time retrospective board. Create a board, share the URL, and
your whole team can drop cards, drag them between columns, and reply with
comments — all updates broadcast instantly over WebSockets. Data lives in a
single SQLite file, so it ships as one Docker container with one mounted volume.

## Features

- Multi-board home page with a "Create board" form
- Default "Went Well / Needs Improvement / Action Items" columns; add custom ones
- Real-time card add / drag-between-columns / comments via Socket.io
- Lightweight "guest" sessions — just enter a display name to join
- CSV export of an entire board's contents (columns × cards × comments)
- SQLite storage with WAL mode; durable across restarts via volume mount

## Tech stack

| Layer    | Tech                                                     |
| -------- | -------------------------------------------------------- |
| Server   | Node.js 22+, Express, Socket.io, `node:sqlite` (built-in)|
| Client   | React 18 + Vite, React Router, `@hello-pangea/dnd`       |
| Storage  | SQLite (file-backed; volume-friendly)                    |
| Realtime | Socket.io rooms, one per board                           |

> **Note**: storage uses Node's built-in `node:sqlite` module (stable from Node
> 22.5+), so there's no native compilation step or pre-built binary needed.

## Quick start (local dev)

```bash
# install backend + client deps in one go
npm run install:all

# run server (port 3001) and Vite dev server (port 5173) together
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` and `/socket.io` to the
backend, so the UI sees a single origin.

## Production build (single Node process)

```bash
npm run install:all
npm run build      # builds client to client/dist
npm start          # serves API + static client from one port (3001)
```

Then open <http://localhost:3001>.

## Docker

```bash
docker build -t retro-board .
docker run --rm -p 3001:3001 -v retro-data:/data retro-board
```

The container persists the SQLite database at `/data/retro.sqlite`. Mount any
host directory you like for durable storage:

```bash
docker run --rm -p 3001:3001 -v "$PWD/data:/data" retro-board
```

## Environment variables

| Variable  | Default                 | Purpose                              |
| --------- | ----------------------- | ------------------------------------ |
| `PORT`    | `3001`                  | HTTP / Socket.io listen port         |
| `DB_PATH` | `./data/retro.sqlite`   | Absolute path to the SQLite database |

## Project layout

```
.
├── server/                # Express + Socket.io backend
│   ├── index.js           # HTTP server bootstrap
│   ├── routes.js          # REST endpoints (/api/...)
│   ├── sockets.js         # Realtime event handlers
│   └── db.js              # SQLite schema + queries
├── client/                # Vite + React frontend
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── pages/{HomePage,BoardPage}.jsx
│       └── components/{Column,Card,NamePrompt}.jsx
├── docs/
│   ├── API.md             # REST + Socket.io contract
│   └── FRONTEND.md        # Client architecture
├── Dockerfile
└── README.md
```

## Docs

- [`docs/API.md`](docs/API.md) — REST endpoints + Socket.io events
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — Client architecture overview
