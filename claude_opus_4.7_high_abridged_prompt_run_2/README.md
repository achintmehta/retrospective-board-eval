# Retro — Real-time Retrospective Board

A self-hosted, real-time retrospective board for teams. Create boards, add cards to columns,
drag them around, discuss with comments, and export everything to CSV — all in real time
across every connected client. No accounts, no external services, no complex setup.

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: React (Vite) + `@dnd-kit`
- **Realtime**: Socket.io rooms per board
- **Storage**: SQLite (via `better-sqlite3`, WAL mode)
- **Deployment**: single Docker container

## Quick start (local)

Requires Node.js 20+.

```bash
npm install       # installs server + client deps
npm run dev       # starts server on :3001 and Vite dev server on :5173
```

Open <http://localhost:5173>. The dev server proxies `/api` and `/socket.io` to the
backend on port 3001.

To stop, `Ctrl+C`. Data is persisted in `data/retro.sqlite`.

## Production build

```bash
npm run build     # builds the client into client/dist
npm start         # serves API + static SPA from port 3001
```

Open <http://localhost:3001>.

## Docker (single container)

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v $(pwd)/data:/data retro-board
```

The container serves both the API and the built frontend on port 3001. SQLite data lives
in `/data` inside the container; mount a volume to persist across restarts.

## Configuration

| Env var    | Default              | Description                              |
| ---------- | -------------------- | ---------------------------------------- |
| `PORT`     | `3001`               | HTTP port                                |
| `DATA_DIR` | `./data` (or `/data` in Docker) | Directory for the SQLite file |

## How it works

1. Anyone can open the app and create a board by giving it a title. The board starts with three
   default columns: **What went well**, **What could be improved**, and **Action items**.
2. Sharing the board's URL invites others in. Each user enters a display name (kept in
   `localStorage`) before they can interact — no signup required.
3. Every action (add card, move card, add comment, add column) is broadcast over Socket.io
   to every other client viewing the same board.
4. At any time, click **Export CSV** to download every card and comment for the board as a
   spreadsheet-friendly file.

## Project layout

```
.
├── server/                  # Express + Socket.io + SQLite
│   ├── index.js             # HTTP entry point
│   ├── db.js                # SQLite connection + schema
│   ├── repository.js        # Query and mutation helpers
│   ├── routes.js            # REST endpoints
│   └── sockets.js           # Socket.io event handlers
├── client/                  # Vite React SPA
│   └── src/
│       ├── pages/           # HomePage, BoardPage, NotFoundPage
│       ├── components/      # UI: columns, cards, drawers, modals
│       ├── lib/             # api, socket, identity, formatting
│       └── styles/global.css
├── scripts/
│   └── smoke-socket.mjs     # Two-client realtime smoke test
├── docs/
│   ├── api.md               # REST + Socket.io reference
│   └── frontend.md          # Frontend architecture notes
├── Dockerfile
├── package.json             # Server + orchestration
└── data/                    # SQLite file (created at runtime)
```

## Documentation

- [`docs/api.md`](docs/api.md) — REST endpoints and Socket.io events
- [`docs/frontend.md`](docs/frontend.md) — Frontend components and state model

## Development notes

- SQLite runs in WAL mode with foreign keys on. Concurrency is more than enough for
  team-sized retros (10–30 people).
- Card and column positions are stored as integers and renormalized on every move.
- On WebSocket disconnect, the client reconnects automatically and refetches the board.
- Guest display names are only stored client-side. Anyone joining a board sees
  everyone else's names; there is no admin/mod concept — this is designed for trusted
  intra-team use.

## License

MIT
