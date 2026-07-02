# Retro — Real-time Retrospective Board

A self-hosted, real-time retrospective board for teams. Zero external SaaS, single Docker
container, and a premium collaborative UI powered by WebSockets.

- **Backend:** Node.js + Express + Socket.io + SQLite (better-sqlite3)
- **Frontend:** React (Vite + TypeScript) + `@dnd-kit` for drag-and-drop
- **Storage:** SQLite (WAL mode) — persists to a mounted volume
- **Real-time:** Socket.io rooms per board with broadcast

## Features

- Create boards with the default columns `Went Well`, `Needs Improvement`, `Action Items`
- Add custom columns to any board
- Add cards to columns with your display name
- Drag-and-drop cards between columns (real-time to every connected client)
- Open a card and thread comments underneath it
- One-click export of an entire board to CSV
- Guest sessions — no signup, just pick a display name

## Quick start (local dev)

Requirements: Node.js 20+ and npm.

```bash
# 1) Install everything
npm install

# 2) Start backend + frontend together
npm run dev
```

- Frontend: <http://localhost:5173>
- Backend API + Socket.io: <http://localhost:3001>

Vite proxies `/api` and `/socket.io` to the backend, so the same origin is used from the browser.

## Production build

```bash
npm run build     # builds client and server
npm start         # runs the compiled server, which also serves client/dist
```

The server listens on `PORT` (default `3001`). SQLite lives in `DATA_DIR` (default `./data`).

## Docker

Build and run a single container that serves both the API and the client:

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/data retro-board
```

Then visit <http://localhost:3001>. Data persists across restarts via the `retro-data` volume.

## Project layout

```
.
├── package.json         # workspace root
├── Dockerfile           # single-image build (multi-stage)
├── server/              # Express + Socket.io + SQLite
│   ├── src/
│   │   ├── index.ts     # HTTP + Socket.io bootstrap; serves client build
│   │   ├── db.ts        # SQLite init (WAL mode) + schema
│   │   ├── repository.ts# CRUD functions
│   │   ├── routes.ts    # REST endpoints
│   │   ├── sockets.ts   # WebSocket event handlers
│   │   └── csv.ts       # Board → CSV serializer
│   └── docs/API.md      # API reference
└── client/              # Vite + React + TypeScript
    ├── src/
    │   ├── App.tsx      # Router + layout
    │   ├── pages/
    │   ├── components/
    │   ├── api.ts       # REST client
    │   └── socket.ts    # Socket.io client
    └── docs/FRONTEND.md # Frontend architecture
```

## Documentation

- [API reference](server/docs/API.md)
- [Frontend architecture](client/docs/FRONTEND.md)
- [OpenSpec change](openspec/changes/realtime-retro-board/proposal.md)

## Environment variables

| Variable     | Default                    | Purpose                                   |
| ------------ | -------------------------- | ----------------------------------------- |
| `PORT`       | `3001`                     | HTTP port for the backend                 |
| `DATA_DIR`   | `./data` (host) / `/data` (container) | Directory where SQLite lives   |
| `CLIENT_DIR` | `../client/dist` (relative to server) | Path to the built client to serve |

## License

MIT.
