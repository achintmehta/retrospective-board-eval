# Retro Board

A self-hosted, real-time team retrospective board. Spin up boards with
configurable columns, collaborate in real time over WebSockets, leave
threaded comments, and export everything to CSV when you&rsquo;re done.

- **Zero SaaS lock-in.** Runs on your laptop, server, or a single Docker
  container — no external services, no accounts.
- **Realtime by default.** Card creation, drag-and-drop reordering, and
  comments propagate instantly via Socket.io rooms.
- **One-file database.** Stores everything in a SQLite file you can back
  up, mount as a Docker volume, or just delete to start over.
- **Premium UI.** Dark glassmorphism aesthetic with smooth micro-animations,
  responsive layout, and accessible keyboard interactions.

## Stack

| Layer        | Choice                                                |
| ------------ | ------------------------------------------------------ |
| Frontend     | React 18 + Vite, `@hello-pangea/dnd`, React Router 6   |
| Backend      | Node.js + Express, Socket.io 4                         |
| Database     | `node:sqlite` (built-in, no native compile needed)     |
| Container    | Single multi-stage Docker image                         |

## Quick start (local dev)

Requires **Node 24+**. The project uses `node:sqlite`, which is only
stable (no `--experimental-sqlite` flag) on Node 23 and later. Running on
Node 20 fails with `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`.

```bash
# install backend + frontend deps
npm install

# start both backend (4000) and frontend dev server (5173)
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` and
`/socket.io` to the backend, so the experience is identical to production.

## Production / single-container mode

```bash
# 1. Build the React bundle
npm run build

# 2. Start the production server (serves API + SPA on port 4000)
npm start
```

Open <http://localhost:4000>. One Node process serves the API, the
WebSockets, and the static React bundle.

### Docker

```bash
docker build -t retro-board .
docker run -p 4000:4000 -v retro-data:/data retro-board
```

The SQLite file lives in `/data` inside the container, so mount a volume
to persist boards across restarts.

## Environment variables

| Variable          | Default         | Description                                          |
| ----------------- | --------------- | ---------------------------------------------------- |
| `PORT`            | `4000`          | HTTP port the Express server listens on.             |
| `NODE_ENV`        | `development`   | Set to `production` to enable static-bundle serving. |
| `RETRO_DATA_DIR`  | `./data`        | Directory where `retro.sqlite` is stored.            |
| `BACKEND_URL`     | `http://localhost:4000` | Used by the Vite dev proxy (dev only).       |

## How it works

1. Users land on the main page, see existing boards, and create new ones
   (with a template or blank slate).
2. Opening a board prompts for a display name (stored only in
   `sessionStorage`) and joins a Socket.io room scoped to that board.
3. All mutations (`add_card`, `move_card`, `add_comment`) go through the
   socket. The server writes to SQLite inside a transaction, then
   broadcasts the change to the room.
4. Disconnected clients reconnect automatically and refetch board state to
   guarantee they catch up.
5. Anyone in the room can export the current board to CSV at any time.

## Repository layout

```
.
├── server/                # Express + Socket.io backend
│   ├── index.js           # HTTP entry — wires Express, Socket.io, static
│   ├── db.js              # node:sqlite schema, prepared stmts, repos
│   ├── routes.js          # REST endpoints (/api/...)
│   └── sockets.js         # Realtime event handlers
├── client/                # Vite + React frontend
│   ├── src/
│   │   ├── main.jsx       # ReactDOM + Router bootstrap
│   │   ├── App.jsx        # Layout + routing shell
│   │   ├── api.js         # Thin REST client
│   │   ├── socket.js      # Shared socket.io-client singleton
│   │   ├── session.js     # Display-name session helpers
│   │   ├── pages/         # MainPage + BoardPage
│   │   ├── components/    # NameModal, CardModal, Column
│   │   └── styles/        # index.css — full design system
│   └── vite.config.js     # Dev proxy → backend
├── docs/
│   ├── API.md             # REST + Socket.io reference
│   └── FRONTEND.md        # Frontend architecture
├── Dockerfile             # Multi-stage build → single runtime image
├── package.json           # Workspace-style root scripts
└── openspec/              # Spec for this change
```

## Available scripts

| Script              | Purpose                                                              |
| ------------------- | -------------------------------------------------------------------- |
| `npm run dev`       | Run backend (nodemon) + frontend (Vite) concurrently.                |
| `npm run dev:server`| Backend only.                                                        |
| `npm run dev:client`| Vite only.                                                           |
| `npm run build`     | Install client deps & build the production React bundle.             |
| `npm start`         | Start the backend in production mode (serves API + bundled SPA).     |

## Documentation

- [`docs/API.md`](./docs/API.md) — REST endpoints and Socket.io events.
- [`docs/FRONTEND.md`](./docs/FRONTEND.md) — UI architecture, state, design system.

## Limits

This is built for team-sized retrospectives (~10–30 concurrent users per
board). It is **not** designed for thousands of concurrent collaborators or
horizontal scale; SQLite + a single Node process is the deliberate
constraint. There are no offline-first guarantees: on disconnect the
client refetches state on reconnect.
