# RetroBoard

A self-hosted, real-time retrospective board. Create a board, share the URL,
and watch sticky notes appear instantly for the whole team — no signup, no
external services, single container.

- **Backend:** Node.js + Express + Socket.io + SQLite via the built-in `node:sqlite` module — **no native build step**
- **Frontend:** React + Vite + `socket.io-client` + native HTML5 drag-and-drop
- **Storage:** A single `retro.sqlite` file (mount as a Docker volume to persist)

> **Requires Node.js 24+** (or Node 22.5–23.x launched with `--experimental-sqlite`).
> No Python / Visual Studio / C++ toolchain needed — every dependency is pure JavaScript.

---

## Quick start (local dev)

```bash
# 1. Install all deps (root, server, client)
npm run install:all

# 2. Start backend (port 4000) and Vite dev server (port 5173) in parallel
npm run dev
```

Then open <http://localhost:5173>. Vite proxies `/api` and `/socket.io` to
`http://localhost:4000` automatically.

## Production build (single process)

```bash
# 1. Build the client bundle
npm run build

# 2. Run the server, which serves the built client and API from one port
npm run start
# -> http://localhost:4000
```

## Docker (single container)

```bash
docker build -t retro-board .
docker run --rm -p 4000:4000 -v retro-data:/data retro-board
# -> http://localhost:4000
```

The SQLite file lives at `/data/retro.sqlite` inside the container — mount a
volume there to persist data across restarts.

### Environment variables

| Variable      | Default                         | Purpose                                       |
| ------------- | ------------------------------- | --------------------------------------------- |
| `PORT`        | `4000`                          | HTTP/WebSocket port                           |
| `DB_PATH`     | `server/retro.sqlite` (dev) / `/data/retro.sqlite` (Docker) | SQLite file location |
| `CLIENT_DIST` | `client/dist`                   | Folder containing the built React app to serve |

---

## Project layout

```
.
├── server/             Express + Socket.io + SQLite backend
│   ├── src/
│   │   ├── index.js          server bootstrap
│   │   ├── db.js             SQLite connection + schema bootstrap
│   │   ├── repository.js     query/mutation helpers
│   │   ├── routes.js         REST endpoints under /api
│   │   ├── sockets.js        real-time event handlers
│   │   └── csv.js            CSV export serializer
│   └── package.json
├── client/             React + Vite frontend
│   ├── src/
│   │   ├── main.jsx          React entry
│   │   ├── App.jsx           router shell
│   │   ├── api.js            REST client
│   │   ├── socket.js         socket.io-client singleton
│   │   ├── pages/            MainPage, BoardPage
│   │   ├── components/       Column, Card, GuestModal, CommentsModal, …
│   │   └── styles.css        design system + components
│   └── package.json
├── Dockerfile          multi-stage build, single runtime image
├── docs/
│   ├── API.md          REST + WebSocket protocol reference
│   └── FRONTEND.md     component overview + state model
└── openspec/           change proposals & specs
```

## Feature checklist

- [x] Create / list / open boards
- [x] Default columns ("Went Well", "Needs Improvement", "Action Items"); add custom columns
- [x] Guest display-name session (stored in `localStorage`)
- [x] Add cards to columns — broadcasts to all viewers in real time
- [x] Drag cards between columns (and reorder within a column) — broadcasts
- [x] Comment threads per card — broadcasts
- [x] Presence chips when teammates join / leave
- [x] Export full board (cards + comments) as CSV
- [x] Single-port production mode; single Docker image

## Implementation notes

- The server is the source of truth: clients emit intents (`add_card`,
  `move_card`, `add_comment`); the server writes to SQLite and broadcasts the
  resulting state to the board's Socket.io room.
- SQLite runs in WAL mode (`journal_mode = WAL`) — fine for the team-scale
  workload this targets (a couple dozen concurrent users per board).
- On reconnect, the client refetches the board to recover from any missed
  events.
- Drag-and-drop uses native HTML5 events (no extra dependency).

> The original design called for the `sqlite3` npm package. This implementation
> uses Node's built-in `node:sqlite` (`DatabaseSync`) instead — same underlying
> SQLite engine, but zero dependencies and no native compilation step.

## Further reading

- [`docs/API.md`](docs/API.md) — REST + WebSocket reference
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — frontend architecture + state model
