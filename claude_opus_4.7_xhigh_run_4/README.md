# Retro Board

A self-hosted real-time retrospective board. Teams join a board with a display name, then add cards, move them between columns, comment, and export results to CSV — all updated live across every connected client.

- **Backend:** Node.js (Express + Socket.io) with Node's built-in `node:sqlite`
- **Frontend:** React + Vite, drag-and-drop via `@hello-pangea/dnd`
- **Storage:** Single SQLite file (`data/retro.db`)
- **Deploy:** One Docker image, single port, one volume for persistence

## Requirements

- Node.js **22+** (Node 24 recommended). The backend uses the built-in `node:sqlite` module, which removes the need for native compilation toolchains.
- npm 10+

## Quick start (local)

```bash
npm run install:all        # install backend + frontend deps
npm run dev                # boot backend (4000) and Vite dev server (5173)
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` and `/socket.io` to the backend on port 4000.

### Production-style local run

```bash
npm run install:all
npm run build              # bundle the frontend into client/dist
npm start                  # backend serves the API, sockets, AND the static bundle
```

Then open <http://localhost:4000>.

## Quick start (Docker)

```bash
docker build -t retro-board .
docker run --rm -p 4000:4000 -v retro_data:/data retro-board
```

The container exposes port `4000` and persists the SQLite database to the `retro_data` volume.

## Configuration

| Env var      | Default                                | Description                              |
|--------------|----------------------------------------|------------------------------------------|
| `PORT`       | `4000`                                 | HTTP port the backend listens on         |
| `NODE_ENV`   | `development`                          | Set to `production` for prod deployments |
| `DB_PATH`    | `./data/retro.db`                      | Absolute path to the SQLite database     |

## Project layout

```
.
├── server/                 # Express + Socket.io backend
│   ├── index.js            # entrypoint
│   ├── db.js               # SQLite schema + queries
│   ├── sockets.js          # real-time event handlers
│   └── routes/             # REST routes
├── client/                 # Vite + React frontend
│   └── src/
├── docs/
│   ├── API.md              # REST + Socket.io contract
│   └── FRONTEND.md         # frontend architecture
├── Dockerfile
└── data/                   # SQLite file lives here (gitignored)
```

## Using the app

1. Visit the main page and create a new board (e.g. *"Sprint 42 Retro"*).
2. On the board page, enter a display name (cached in `localStorage`).
3. The board starts with three default columns — *Went Well*, *Needs Improvement*, *Action Items*. Add more via the "+ Add column" tile.
4. Add cards to a column with **+ Add card** (Enter submits, Esc cancels).
5. Drag cards between columns to reorder.
6. Click a card to open it, view comments, and reply (Cmd/Ctrl + Enter submits).
7. Click **Export CSV** to download the board's contents.

All changes broadcast over WebSocket to every connected client. If you reconnect after a disconnect, the client refetches the latest board state.

## Documentation

- [API contract](docs/API.md) — REST endpoints and Socket.io events
- [Frontend overview](docs/FRONTEND.md) — components, state, and real-time wiring

## Why this stack

- **`node:sqlite`** (built-in to Node 22+) eliminates the native build toolchain headache that plagues `better-sqlite3`/`node-sqlite3` on Windows.
- **Socket.io** handles rooms, reconnects, and acks out of the box, which is what we need for board-scoped broadcasts.
- **Vite + React + `@hello-pangea/dnd`** is a battle-tested combo for snappy drag-and-drop boards.
