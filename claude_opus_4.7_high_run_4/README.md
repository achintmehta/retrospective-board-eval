# Realtime Retro Board

A self-hosted, single-container real-time retrospective board.

- **Backend:** Node.js + Express + Socket.io + SQLite (via `better-sqlite3`)
- **Frontend:** React + Vite + `@hello-pangea/dnd` + `socket.io-client`
- **Persistence:** A single `.sqlite` file (mountable as a Docker volume)
- **Auth:** Guest display name only — no accounts, no SSO

> Note on stack: the design document mentions a TypeScript full-stack. To keep
> build tooling and runtime dependencies minimal we ship plain JavaScript on
> both ends. Domain types are simple enough (boards / columns / cards /
> comments) that the trade-off is acceptable for a self-hosted tool.

## Quick start (local dev)

Requires Node.js 18+.

```bash
# 1. Install backend + frontend deps
npm run install:all

# 2. Run both servers (Express on :4000, Vite on :5173).
#    Vite proxies /api and /socket.io to :4000.
npm run dev
```

Then open <http://localhost:5173>.

## Quick start (Docker, single container)

```bash
docker build -t retro-board .
docker run -p 4000:4000 -v retro-data:/app/data retro-board
```

Then open <http://localhost:4000>. The SQLite file lives in the
`retro-data` named volume so it survives container restarts.

## Production (without Docker)

```bash
npm run install:all
npm run build      # produces client/dist
NODE_ENV=production npm start
```

The Express server serves both the API and the built React app from a single
port (default `4000`).

## Configuration

| Variable  | Default                       | Description                          |
|-----------|-------------------------------|--------------------------------------|
| `PORT`    | `4000`                        | Port the HTTP/WebSocket server binds |
| `DB_PATH` | `<repo>/data/retro.sqlite`    | Location of the SQLite database file |

## How it works (one-paragraph version)

The server is the source of truth. Clients connect via Socket.io, join a
board room (`board:<id>`), and emit `add_card` / `move_card` / `add_comment`
events. The server validates, writes to SQLite, then broadcasts the persisted
entity to every socket in the room (including the sender, so optimistic UI
can reconcile). When a client (re)joins via `join_board`, the server replies
with the full board snapshot so reconnecting clients are always consistent.

## Documentation

- [`docs/api.md`](docs/api.md) — REST + Socket.io reference
- [`docs/frontend.md`](docs/frontend.md) — Frontend architecture
- [`openspec/changes/realtime-retro-board/`](openspec/changes/realtime-retro-board/)
  — Original proposal, design, specs, and tasks

## Project layout

```
.
├── server/                  Node.js backend
│   ├── index.js             Express + Socket.io entrypoint
│   ├── db/                  SQLite connection, schema, repository
│   ├── routes/              REST routers (boards, export)
│   └── sockets/             Socket.io event handlers
├── client/                  Vite + React frontend
│   └── src/
│       ├── pages/           MainPage, BoardPage
│       ├── components/      Column, Card, CardModal, GuestAuthModal
│       ├── api.js           REST client
│       └── socket.js        Socket.io client factory
├── Dockerfile               Multi-stage single-container build
└── openspec/                Spec-driven change history
```
