# Retro Board

Self-hosted, real-time retrospective board with a React UI, an Express + Socket.io
backend, and SQLite storage. Designed to run locally or as a single Docker
container — no `docker-compose`, no external DB, no SaaS account.

## Features

- Create as many retro boards as you like, each with its own URL.
- Default columns "Went Well", "Needs Improvement", "Action Items" — add more on the fly.
- Cards and comments sync to every connected participant in real time via WebSockets.
- Drag-and-drop cards between columns (powered by `@hello-pangea/dnd`).
- Frictionless guest sessions — pick a display name and join.
- Export the entire board (columns, cards, comments) to CSV with one click.
- Single-binary deployment story via a multi-stage Dockerfile.

## Quick Start (local development)

Requirements: Node.js ≥ 20 (Node 22+ recommended — uses the built-in `node:sqlite` module).

```bash
# 1. install backend dependencies
npm install

# 2. install frontend dependencies
npm --prefix client install

# 3. run backend + frontend together with hot reload
npm run dev
```

The Express server listens on `http://localhost:4000` and the Vite dev server
runs on `http://localhost:5173`. Vite proxies `/api/*` and `/socket.io/*` to the
backend, so open the frontend at **http://localhost:5173**.

SQLite data is persisted to `./data/retro.sqlite`.

## Production build

```bash
npm run build      # builds the React client
npm start          # NODE_ENV=production, serves API + static client from :4000
```

In production the Express server also serves the built React assets, so
everything is reachable from a single port.

## Docker

```bash
docker build -t retro-board .
docker run --rm -p 4000:4000 -v retro-data:/data retro-board
```

The container exposes port `4000` and persists SQLite data to the `/data`
volume. Map a host directory or named volume to keep your boards across restarts.

## Project layout

```
.
├── server/                 # Express + Socket.io backend
│   ├── index.js            #   HTTP + WebSocket bootstrap, static asset serving
│   ├── routes.js           #   REST endpoints
│   ├── sockets.js          #   Socket.io event handlers
│   ├── db.js               #   SQLite schema + data access (node:sqlite)
│   └── export.js           #   CSV serializer
├── client/                 # Vite + React frontend
│   ├── src/pages/          #   HomePage, BoardPage
│   ├── src/components/     #   Column, Card, AddColumn, CommentDrawer, NameModal
│   ├── src/hooks/          #   useBoardSocket
│   └── src/lib/            #   api.js, identity.js
├── docs/
│   ├── API.md              #   REST + Socket.io reference
│   └── FRONTEND.md         #   Frontend architecture
├── Dockerfile
└── openspec/               # Change proposals + specs
```

## Environment variables

| Variable    | Default                    | Description                              |
|-------------|----------------------------|------------------------------------------|
| `PORT`      | `4000`                     | HTTP port the server listens on.         |
| `NODE_ENV`  | `development`              | Set to `production` to serve `client/dist`. |
| `DATA_DIR`  | `./data` (or `/data` in Docker) | Directory for `retro.sqlite`.       |
| `DB_PATH`   | `$DATA_DIR/retro.sqlite`   | Explicit path override.                  |

## Documentation

- [`docs/API.md`](docs/API.md) — REST endpoints and Socket.io events.
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — Frontend architecture and component tree.

## Implementation notes

- SQLite is accessed via the built-in `node:sqlite` module (Node 22+), so no
  native dependencies need to be compiled. Foreign keys and WAL journaling are
  enabled at startup.
- The server is the source of truth. Clients emit intent events (`add_card`,
  `move_card`, `add_comment`); the server persists and re-broadcasts the
  resulting state to all sockets in the board's room.
- The UI applies optimistic drag-and-drop updates and refetches the board if a
  move ever fails server-side.

## License

For internal use within this evaluation workspace.
