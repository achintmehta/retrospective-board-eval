# Retro — Real-time Retrospective Board

A self-hosted, real-time retrospective board built as a single Node.js + React application. Zero external services, single SQLite file for persistence, single Docker image for deployment.

- **Realtime** — cards, moves, and comments broadcast instantly via Socket.io
- **Drag-and-drop** columns powered by `@hello-pangea/dnd`
- **Guest sessions** — display name only, stored in the browser
- **CSV export** — download all cards + comments from any board
- **Single container** — SQLite file volume-mapped for persistence

## Quick start (development)

```bash
# 1. Install everything (root + client)
npm run install:all

# 2. Start backend (port 4000) and Vite dev server (port 5173) concurrently
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` and `/socket.io` to `localhost:4000` (see `client/vite.config.js`), so hot-reload and websockets both work out of the box.

## Quick start (production, single command)

```bash
npm run install:all
npm run build
npm start
```

Then open [http://localhost:4000](http://localhost:4000). Express serves both the API and the built client bundle from a single port.

## Docker

```bash
# Build the image
docker build -t retro-board .

# Run — mount a host directory for persistent data
docker run --rm -p 4000:4000 -v "$(pwd)/data:/data" retro-board
```

The SQLite database is stored inside `/data` (configurable via `DATA_DIR`), so mounting a volume gives you durable retrospectives across restarts.

## Configuration

| Env var    | Default                 | Description                     |
| ---------- | ----------------------- | ------------------------------- |
| `PORT`     | `4000`                  | HTTP + WebSocket port           |
| `DATA_DIR` | `./data`                | Directory that holds the SQLite file |
| `DB_FILE`  | `${DATA_DIR}/retro.sqlite` | Full path to the SQLite database   |

## Project layout

```
.
├── server/            Node.js + Express + Socket.io backend
│   ├── index.js       HTTP + WebSocket entry point
│   ├── db.js          SQLite bootstrap and schema
│   ├── repository.js  All DB reads/writes
│   ├── routes.js      REST API surface
│   ├── realtime.js    Socket.io rooms and events
│   └── csv.js         CSV builder for board export
├── client/            Vite + React frontend
│   └── src/
│       ├── pages/     MainPage, BoardPage
│       ├── components/  Column, Card, forms, modals, ...
│       ├── hooks/     Board socket + display name
│       └── styles/    Global stylesheet (design tokens, layouts)
├── scripts/smoke.mjs  End-to-end smoke test (REST + WebSocket)
├── docs/              API and frontend documentation
├── Dockerfile         Multi-stage build (client → server → runtime)
└── package.json       Root workspace with dev/build/start scripts
```

## Documentation

- **[docs/api.md](docs/api.md)** — REST + Socket.io event reference
- **[docs/frontend.md](docs/frontend.md)** — Frontend architecture, hooks, and design system

## Notes on the stack

- **`better-sqlite3`** is used instead of the legacy `sqlite3` package (originally listed in the change plan). It has a synchronous, transaction-friendly API, ships prebuilt native binaries for common platforms (including Windows), and works out of the box with recent Node.js versions.
- **Persistence model** — the server is the single source of truth. Clients emit intent (add/move/comment); the server writes to SQLite, then broadcasts the concrete result to the board's room.
- **Real-time contract** — Socket.io acknowledgements are used everywhere, so the client can surface backend errors even when the change is not visible in the DOM.

## License

MIT (or your project's license — this repo ships with the retrospective board only).
