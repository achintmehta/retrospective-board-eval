# Retro — Real-time Retrospective Board

A self-hosted, real-time retrospective board. Spin up boards, drop cards in columns,
drag cards around, leave threaded comments, and export everything to CSV — all
backed by a single Node process and a SQLite file.

- 🎯 **Real-time** sync via Socket.io rooms
- 🪶 **Zero setup** — SQLite file, single container, one process
- 👤 **Guest sessions** — pick a display name and go
- 🧲 **Drag-and-drop** cards across columns
- 💬 **Nested comments** on every card
- 📦 **CSV export** of full board state

## Quick start (local)

```bash
# 1. Install dependencies (root + client)
npm run install:all

# 2. Run dev (Express on :3001, Vite on :5173 with proxy)
npm run dev

# 3. Open the app
# http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to the Express server, so
hot-module reloading on the frontend and `nodemon` on the backend both Just Work.

### Production-style local run

```bash
npm run build      # builds client/dist
npm start          # serves API + static frontend from one process on :3001
# http://localhost:3001
```

## Quick start (Docker)

```bash
docker build -t retro-board .
docker run --rm -p 3001:3001 -v retro-data:/data retro-board
# http://localhost:3001
```

The SQLite file is persisted at `/data/retro.sqlite` inside the container. Mount
a named volume or a host directory to retain boards across restarts.

### Environment

| Variable        | Default                | Description                                |
| --------------- | ---------------------- | ------------------------------------------ |
| `PORT`          | `3001`                 | Port the server listens on                 |
| `RETRO_DB_PATH` | `./data/retro.sqlite`  | SQLite file location                       |

## Project layout

```
.
├── server/                 # Express + Socket.io backend
│   ├── index.js            # Bootstrap, static serving, socket wiring
│   ├── routes.js           # REST API
│   ├── sockets.js          # Socket.io event handlers
│   ├── db.js               # SQLite schema + data access
│   └── csv.js              # Board → CSV serialization
├── client/                 # Vite + React frontend
│   ├── src/
│   │   ├── pages/          # HomePage, BoardPage, NotFoundPage
│   │   ├── components/     # Column, Card, GuestAuthModal, CardDrawer
│   │   ├── hooks/          # useBoardSocket, useToast
│   │   ├── state/          # boardReducer
│   │   ├── lib/            # api, session, format
│   │   └── index.css       # Design system tokens + primitives
│   └── vite.config.js
├── docs/
│   ├── api.md              # REST + WebSocket reference
│   └── frontend.md         # Frontend architecture guide
├── Dockerfile
└── openspec/               # Spec-driven change history
```

## Stack & decisions

- **Backend**: Node 18+, Express 4, Socket.io 4, `better-sqlite3` (synchronous,
  WAL mode). We chose `better-sqlite3` over the callback-based `sqlite3` driver
  because the synchronous API yields cleaner code without measurable contention
  for team-sized boards.
- **Frontend**: React 18, Vite 5, React Router 6, `@dnd-kit` for drag-and-drop,
  `socket.io-client` for real-time. No CSS framework — a custom design system
  (see `client/src/index.css`) gives us full control over the dark, premium look.
- **Persistence**: SQLite with `journal_mode = WAL` and foreign keys enabled.
  Cascading deletes keep columns, cards, and comments consistent when a board
  is removed.

## Server-as-source-of-truth

Every state change is emitted from the client as a Socket.io event. The server
writes to SQLite and broadcasts the canonical update to every member of the
board room. Clients render their local copy optimistically (for drag-and-drop)
and reconcile on the next broadcast. On reconnect we refetch the full board.

## Scripts

| Command             | Description                                         |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Start backend (nodemon) + frontend (Vite) together  |
| `npm run dev:server`| Backend only with hot-reload                        |
| `npm run dev:client`| Frontend only                                       |
| `npm run build`     | Build the production client bundle                  |
| `npm start`         | Run the server (serves built client if available)   |
| `npm run install:all` | Install root + client dependencies                |

## API & WebSocket reference

See [`docs/api.md`](./docs/api.md) for endpoint and event details.

## Frontend architecture

See [`docs/frontend.md`](./docs/frontend.md) for component and state-flow notes.

## License

Use it, modify it, run it inside your team.
