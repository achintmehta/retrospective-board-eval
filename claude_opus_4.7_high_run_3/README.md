# Retro Board

A self-hosted, real-time retrospective board. Create boards, add cards to columns ("Went Well", "Needs Improvement", etc.), drag cards between columns, comment, and export to CSV — all synced live across every connected client.

- **Frontend:** React (Vite) + `@hello-pangea/dnd` + `socket.io-client`
- **Backend:** Node.js (Express) + Socket.io
- **Database:** SQLite (`better-sqlite3`) — a single `.sqlite` file
- **Deployment:** A single Docker container

## Quick Start (Local)

Requires Node 18+.

```bash
npm install
npm run dev
```

This starts:

- Backend on `http://localhost:3001`
- Vite dev server on `http://localhost:5173` (proxies `/api` and `/socket.io` to the backend)

Open `http://localhost:5173` in your browser.

### Production-style local run

```bash
npm run build      # builds the client into client/dist
npm start          # backend serves the built client on :3001
```

Open `http://localhost:3001`.

## Docker

Build and run a single self-contained container:

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/data retro-board
```

The SQLite database lives at `/data/retro.sqlite` inside the container, mapped to the `retro-data` named volume so data persists across restarts.

## Environment Variables

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `PORT`    | `3001`  | HTTP port for the backend |
| `DB_PATH` | `./retro.sqlite` (local) / `/data/retro.sqlite` (Docker) | SQLite file path |

## Project Layout

```
.
├── server/             Express + Socket.io backend
│   ├── index.js        Entry point
│   ├── db.js           SQLite schema & queries
│   ├── routes.js       REST API
│   └── sockets.js      Real-time event handlers
├── client/             Vite + React frontend
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx     Layout shell
│       ├── main.jsx    Router setup
│       ├── pages/      HomePage, BoardPage
│       └── components/ GuestAuthModal, Column, CardItem
├── docs/
│   ├── api.md          REST + WebSocket API reference
│   └── frontend.md     Frontend architecture notes
├── Dockerfile
└── package.json
```

## Documentation

- [`docs/api.md`](docs/api.md) — REST endpoints and Socket.io events
- [`docs/frontend.md`](docs/frontend.md) — Frontend architecture
