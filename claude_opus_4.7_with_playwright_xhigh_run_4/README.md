# Retro Board

A self-hosted, real-time retrospective board. Create a board, share the URL with
your team, and collaborate live on cards and comments. Ships as a single Docker
image with SQLite for storage — no external dependencies.

## Features

- Real-time card and comment sync across all viewers via WebSockets (Socket.io).
- Drag-and-drop reordering of cards across columns.
- Configurable columns per board (seeded with the classic retro set).
- Guest sessions — pick a display name and you are in.
- One-click CSV export of all board contents.
- SQLite persistence, mountable as a Docker volume.

## Requirements

- **Local dev:** Node.js 22.5+ (24 LTS recommended), npm 10+.
- **Docker deploy:** Docker 24+.

> SQLite access uses Node's built-in `node:sqlite` module — there are no native
> dependencies to compile, so `npm install` works out of the box on Windows,
> macOS and Linux without Visual Studio Build Tools, Xcode, or `build-essential`.

## Quick start (local)

```bash
# Install both server and client dependencies
npm install

# Start the API + Vite dev server in parallel
npm run dev
```

- API: <http://localhost:3001>
- Web UI (with hot reload): <http://localhost:5173>

The Vite dev server proxies `/api` and `/socket.io` to the Express server, so
the UI works against `localhost:5173` and the API against `localhost:3001`.

The SQLite file is created on first run at `./data/retro.sqlite`.

## Production build (single process)

```bash
npm install
npm run build      # build the React client to client/dist
NODE_ENV=production npm start
```

The Express server statically serves `client/dist` at the root path and exposes
the API at `/api`, so the whole app runs on a single port (default `3001`).

## Docker

The provided `Dockerfile` produces a slim image that runs both the API and the
static frontend on port `3001`.

```bash
docker build -t retro-board .

# Persist the SQLite file across container restarts with a named volume
docker run --rm -p 3001:3001 -v retro-data:/data retro-board
```

Open <http://localhost:3001>.

## Environment variables

| Variable     | Default                | Purpose                                       |
|--------------|------------------------|-----------------------------------------------|
| `PORT`       | `3001`                 | HTTP port the server listens on.              |
| `DATA_DIR`   | `./data` (dev) `/data` (prod image) | Where the SQLite file is created.   |
| `DB_PATH`    | `<DATA_DIR>/retro.sqlite` | Explicit path to the SQLite file.          |
| `NODE_ENV`   | unset                  | Set to `production` to disable dev hints.     |

## Project layout

```
.
├── server/                 Express + Socket.io backend
│   ├── index.js            Entry point — HTTP, sockets, static client
│   ├── routes/             REST handlers (boards, export)
│   ├── sockets/            Socket.io event handlers
│   └── db/                 SQLite connection, schema, query helpers
├── client/                 Vite + React frontend
│   ├── src/                React app source
│   └── vite.config.js      Dev proxy → http://localhost:3001
├── docs/                   API and frontend reference
├── openspec/               Change proposals and specs
└── Dockerfile              Multi-stage build → single container
```

## Documentation

- [API reference](./docs/API.md) — REST endpoints and Socket.io events.
- [Frontend overview](./docs/FRONTEND.md) — components, data flow, state.

## Limitations / non-goals

- No identity provider — anyone with the board URL can join.
- Designed for team-sized retros (single-digit to a few dozen users per board),
  not for thousands of concurrent users.
- No offline mode — clients refetch board state on reconnect.
