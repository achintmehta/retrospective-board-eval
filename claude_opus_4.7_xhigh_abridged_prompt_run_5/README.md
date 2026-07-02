# Retro — Real-time Retrospective Board

A self-hosted, real-time retrospective board. Create boards with configurable columns, drop
cards, thread comments — every change syncs to every connected client instantly. Ships as a
single Docker container backed by SQLite.

## Highlights

- **Real-time collaboration** over WebSockets (Socket.io), room-scoped per board.
- **Zero-signup** — guest sessions, users pick a display name once.
- **Drag-and-drop** card movement across columns (@dnd-kit).
- **CSV export** of every card and comment in a board.
- **Single container**: Node + Express serves the built React frontend and the API on one port.
- **Single file store**: SQLite (WAL mode) — mount a volume, persist forever.

## Tech stack

| Layer     | Tech                                    |
| --------- | --------------------------------------- |
| Frontend  | React 18, Vite, TypeScript, @dnd-kit    |
| Backend   | Node 20+, Express 4, Socket.io 4        |
| Storage   | SQLite via Node.js built-in `node:sqlite` (WAL mode) — zero native compilation |
| Runtime   | Docker (single container) or plain Node |

## Quick start (local, no Docker)

Prereqs: **Node.js ≥ 22.15** (for the stable built-in `node:sqlite` module). Node.js 24 works too.
No C/C++ toolchain is required — SQLite ships inside Node.js itself.

```bash
# From the repo root:
npm run install:all      # installs root deps and client deps
npm run dev              # starts backend (:4000) and Vite dev server (:5173)
```

Then open http://localhost:5173. Vite proxies `/api` and `/socket.io` to the backend.

## Production build (single Node process)

```bash
npm run install:all
npm run build            # builds the client and compiles the server
npm start                # serves API + realtime + built client on :4000
```

Open http://localhost:4000.

Environment variables:

| Variable     | Default                     | Purpose                                    |
| ------------ | --------------------------- | ------------------------------------------ |
| `PORT`       | `4000`                      | HTTP port the server listens on            |
| `DB_PATH`    | `data/retro.sqlite`         | Path to the SQLite file                    |
| `CLIENT_DIR` | `client/dist` (relative)    | Where to find the built React static files |

## Docker

Build and run as a single container. Mount `/app/data` to persist the SQLite file.

```bash
docker build -t retro-board .
docker run --rm -p 4000:4000 -v retro-data:/app/data retro-board
```

Then browse http://localhost:4000.

## Using the app

1. Open the home page and create a new board.
2. On the board, enter a display name (stored in your browser).
3. Add cards to any column; drag them between columns; reply with comments.
4. Add extra columns from the trailing "New column" tile.
5. Click **Export CSV** in the board header to download all cards and comments.

Every add/move/comment is broadcast to every other client viewing the same board.

## Documentation

- [API reference](./docs/API.md) — REST endpoints and Socket.io events
- [Frontend guide](./docs/FRONTEND.md) — pages, components, data flow
- [OpenSpec change](./openspec/changes/realtime-retro-board) — proposal, design, and specs

## Development scripts

| Script                | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | Backend + frontend, both with hot reload                 |
| `npm run dev:server`  | Just the backend (nodemon + ts-node/esm)                 |
| `npm run dev:client`  | Just the Vite dev server                                 |
| `npm run build`       | Compile the client to `client/dist` and the server to `server/dist` |
| `npm start`           | Run the compiled server                                  |
| `npm run install:all` | Install root and client dependencies                     |

## License

MIT
