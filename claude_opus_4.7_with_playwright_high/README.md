# Retro Board

A self-hosted, real-time retrospective board. Create boards, add columns, drop in
cards, comment, drag things around — every change is broadcast to all connected
clients over WebSockets. Single SQLite file for storage, single Docker image for
deployment.

## Stack

- **Frontend**: React 18 (Vite), React Router, `@hello-pangea/dnd`, `socket.io-client`
- **Backend**: Node.js 22.5+ with Express, Socket.io, built-in `node:sqlite`
- **Storage**: SQLite file (`./data/retro.sqlite` by default, override with `DATA_DIR`)

## Requirements

- **Node.js ≥ 22.5** (the server uses the built-in `node:sqlite` module — no native build toolchain required)
- npm

## Quick start (local development)

```bash
npm install
npm --prefix client install
npm run dev
```

This starts:
- Backend on http://localhost:3001 (REST + Socket.io)
- Vite dev server on http://localhost:5173 with `/api` and `/socket.io` proxied to the backend

Open http://localhost:5173 in two browser windows to see real-time sync.

## Production / single-process

```bash
npm install
npm run build       # builds the React app into client/dist
npm start           # serves API + static client from a single port
```

Open http://localhost:3001.

## Docker (single container)

```bash
docker build -t retro-board .
docker run --rm -p 3001:3001 -v $(pwd)/data:/data retro-board
```

The SQLite file lives in `/data/retro.sqlite` inside the container. Mount any host
directory at `/data` to persist data across restarts.

## Environment variables

| Variable    | Default          | Description                                    |
| ----------- | ---------------- | ---------------------------------------------- |
| `PORT`      | `3001`           | HTTP port the server listens on                |
| `DATA_DIR`  | `./data`         | Directory where `retro.sqlite` is stored       |

## Project layout

```
.
├── server/                  Express + Socket.io backend (ESM)
│   ├── index.js             HTTP server, static client, Socket.io wiring
│   ├── routes.js            REST API router
│   ├── sockets.js           WebSocket event handlers
│   └── db.js                node:sqlite schema + data access helpers
├── client/                  Vite + React frontend
│   ├── src/
│   │   ├── main.jsx
│   │   ├── api.js           REST client wrapper
│   │   ├── pages/           HomePage, BoardPage
│   │   ├── components/      Card, GuestAuthModal
│   │   └── styles.css
│   └── vite.config.js       Dev proxy for /api and /socket.io
├── docs/
│   ├── API.md               REST + WebSocket reference
│   └── FRONTEND.md          Frontend architecture and component map
├── Dockerfile               Multi-stage single-container build
└── openspec/                Spec-driven change history
```

## Documentation

- [`docs/API.md`](docs/API.md) — REST endpoints and WebSocket protocol
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — Frontend architecture and component overview
- [`openspec/changes/realtime-retro-board/`](openspec/changes/realtime-retro-board/) — Proposal, design, and specs for this build

## Notes

- Guest sessions are local-only: a display name is stored in `sessionStorage`
  per tab. There is no server-side authentication; this is by design for a
  team-internal tool.
- Three default columns ("Went Well", "Needs Improvement", "Action Items") are
  created with every new board. You can add more columns from the board page.
- The server is the source of truth: clients apply changes only after receiving
  the broadcast back from the server, which keeps state consistent across users.
