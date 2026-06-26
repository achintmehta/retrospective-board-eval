# Retro Board

A self-hosted, real-time retrospective board. Create a board, share a link with your team, drop cards into columns, comment, and export to CSV when you're done. Runs locally or as a single Docker container.

## Stack

- **Backend:** Node.js + Express + Socket.io
- **Frontend:** React (Vite) with `@hello-pangea/dnd` for drag and drop
- **Storage:** SQLite (Node's built-in `node:sqlite`) with WAL mode
- **Realtime:** Socket.io rooms per board

## Quick Start (Local)

Requires Node.js 22+ (uses the built-in `node:sqlite` module).

```bash
npm install         # installs server and client dependencies
npm run dev         # starts backend on :3001 and Vite dev server on :5173
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` and `/socket.io` to the Express server.

### Production-style local run

```bash
npm install
npm run build       # builds the React client into client/dist
npm start           # serves API, sockets, and the built client from :3001
```

Then open <http://localhost:3001>.

The SQLite database file is created at `data/retro.db` on first run.

## Docker

The repo includes a multi-stage `Dockerfile` that builds the client and serves everything from one container.

```bash
docker build -t retro-board .
docker run --rm -p 3001:3001 -v "$(pwd)/data:/app/data" retro-board
```

- App: <http://localhost:3001>
- The `data` volume persists `retro.db` across restarts.

## Environment Variables

| Name          | Default                          | Purpose                                      |
|---------------|----------------------------------|----------------------------------------------|
| `PORT`        | `3001`                           | HTTP/socket port                             |
| `DB_PATH`     | `./data/retro.db`                | SQLite file path                             |
| `CLIENT_DIST` | `./client/dist`                  | Static client bundle to serve (when present) |

## Project Layout

```
.
├── server/         # Express + Socket.io + SQLite
├── client/         # React (Vite) frontend
├── data/           # SQLite DB lives here (gitignored)
├── Dockerfile
├── package.json    # root scripts: dev, build, start
└── docs/           # API & frontend documentation
```

## Documentation

- [API reference](docs/api.md) — REST endpoints and Socket.io events
- [Frontend guide](docs/frontend.md) — component/state architecture

## Features

- Create boards with default columns ("Went Well", "Needs Improvement", "Action Items")
- Add and reorder custom columns
- Add cards to columns, drag-and-drop to reorder/move
- Add comments (nested) to any card
- Guest auth: enter a display name to join a board
- Live updates over Socket.io across all connected clients on the same board
- Export a board to CSV (cards + comments)

## Notes

- WAL mode is enabled to allow concurrent reads/writes — comfortable for team-sized boards (10-30 users).
- The server is the source of truth: clients emit events, the server writes to SQLite and broadcasts to the board room.
- On reconnect, the client refetches the full board state.
