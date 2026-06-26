# Retro — Realtime Retrospective Boards

A self-hosted, single-container retrospective board with live multi-user
collaboration over WebSockets and zero-setup SQLite storage.

- Real-time card add / move / comment via Socket.io
- Configurable columns (defaults: Went Well, Needs Improvement, Action Items)
- Drag-and-drop card movement with `@dnd-kit`
- Guest sessions — just enter a display name to join
- CSV export of cards and comments
- One Node process serves both the API and the built React app
- Designed to run anywhere `node` runs, no external services

## Quick start (local dev)

Requires **Node.js 22.5+** (uses the built-in `node:sqlite` module).
Node 24 is recommended for the stable API.

```bash
# 1. Install everything (backend + client)
npm run install:all

# 2. Start backend (port 3001) and Vite dev server (port 5173) together
npm run dev

# 3. Open http://localhost:5173
```

The dev server proxies `/api` and `/socket.io` to the backend, so the UI
behaves identically in dev and prod.

## Production (single process)

```bash
npm run install:all
npm run build         # produces client/dist
npm start             # serves API + static UI on port 3001
```

Open <http://localhost:3001>.

## Docker (single container)

```bash
docker build -t retro-board .
docker run --rm -p 3001:3001 -v retro-data:/app/data retro-board
```

The SQLite database lives at `/app/data/retro.sqlite` inside the container.
Mounting `retro-data` (or any host directory) onto `/app/data` makes board
data persist across restarts.

### Environment variables

| Variable    | Default              | Description                           |
| ----------- | -------------------- | ------------------------------------- |
| `PORT`      | `3001`               | HTTP port for API + static UI         |
| `DATA_DIR`  | `<repo>/data`        | Directory containing `retro.sqlite`   |
| `DB_PATH`   | `$DATA_DIR/retro.sqlite` | Override the database file path   |

## Project structure

```
.
├── server/
│   ├── index.js      # Express + Socket.io + static serving
│   ├── routes.js     # REST endpoints (boards, columns, export)
│   ├── sockets.js    # Real-time event handlers
│   └── db.js         # SQLite schema + queries (node:sqlite)
├── client/
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   └── BoardPage.jsx
│   │   ├── components/
│   │   └── lib/      # api / socket / identity helpers
│   └── vite.config.js
├── docs/
│   ├── API.md        # REST + Socket.io contract
│   └── FRONTEND.md   # UI architecture, state model, DnD logic
├── Dockerfile
└── package.json      # Backend + dev orchestration
```

## Notes on dependencies

The original task list mentions `sqlite3` as a dependency. To avoid native
toolchain requirements on Windows (Visual Studio Build Tools) and to stay
zero-install, this project uses Node's built-in
[`node:sqlite`](https://nodejs.org/api/sqlite.html) module instead — same
underlying SQLite engine, no native rebuild step, no extra package.

## Further documentation

- [`docs/API.md`](docs/API.md) — REST + Socket.io event contract
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — UI architecture, state model, design system
