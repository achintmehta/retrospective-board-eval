# Retro Board

A self-hosted, real-time retrospective board. One Node.js process serves an Express REST API, a Socket.io collaboration layer, and the built React UI. Data lives in a single SQLite file.

## Features

- Create and list retrospective boards
- Configurable columns per board (defaults to "Went Well", "Needs Improvement", "Action Items")
- Add cards to columns, drag and drop between columns, nest comments on cards
- Real-time updates across all connected clients via WebSockets
- Guest sessions — users join a board by entering a display name (no accounts)
- Export the entire board (columns, cards, comments) to CSV
- Single Docker container for production deployment with a SQLite-backed volume

## Quick start (local)

Requirements: Node.js 20+ and npm.

```bash
# Install backend + frontend deps (postinstall runs `npm install` in client/)
npm install

# Run both servers (Express on :3001, Vite dev on :5173)
npm run dev
```

Then open http://localhost:5173. The Vite dev server proxies `/api` and `/socket.io` to the backend on `:3001`.

## Production / single-process

```bash
# Build the client into client/dist/
npm run build

# Start the Node server (serves API, sockets, and static client on :3001)
npm start
```

The SQLite database file is created at `./data/retro.sqlite` (override with `DATA_DIR=/path`).

## Docker

A single multi-stage Dockerfile builds the client, installs the backend, and runs the combined service.

```bash
# Build
docker build -t retro-board .

# Run, persisting SQLite data to a host directory
docker run --rm -p 3001:3001 -v $(pwd)/data:/data retro-board
```

The container exposes port `3001` and stores data in `/data` (mounted as a volume).

## Configuration

| Variable   | Default            | Description                          |
| ---------- | ------------------ | ------------------------------------ |
| `PORT`     | `3001`             | HTTP port the server binds to        |
| `DATA_DIR` | `./data` in dev, `/data` in container | Directory containing `retro.sqlite` |

## Project layout

```
.
├── server/             # Express + Socket.io backend (ESM)
│   ├── index.js        # Bootstraps HTTP + Socket.io, serves built client
│   ├── db.js           # SQLite schema and data access (better-sqlite3)
│   ├── routes/         # REST routers (boards, export)
│   └── sockets/        # Realtime event handlers
├── client/             # Vite + React frontend
│   ├── index.html
│   └── src/
│       ├── pages/      # MainPage, BoardPage
│       ├── components/ # Column, Card, GuestAuthModal
│       ├── api.js, socket.js, App.jsx
│       └── styles.css
├── docs/
│   ├── API.md          # REST + WebSocket reference
│   └── FRONTEND.md     # Frontend architecture
├── Dockerfile
└── package.json
```

## Documentation

- [`docs/API.md`](docs/API.md) — REST endpoints and Socket.io events
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — Frontend structure and state management

## Tech stack

- Backend: Node.js, Express, Socket.io, better-sqlite3
- Frontend: React 18, Vite, React Router, @hello-pangea/dnd, socket.io-client
- Storage: SQLite (WAL mode)

## Notes on design choices

- **better-sqlite3** is used instead of `node-sqlite3` for synchronous, transactional access — cleaner code for this single-process workload.
- The server is the source of truth. Clients emit intent events (`add_card`, `move_card`, `add_comment`), the server persists and broadcasts the resulting state to the board's room.
- Guest sessions store the display name in `sessionStorage`; no server-side accounts.
