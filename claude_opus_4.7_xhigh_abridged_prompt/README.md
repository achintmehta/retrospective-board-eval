# Retro — Real-time Retrospective Board

A self-hosted, real-time retrospective board for teams. Create a board, drop cards into
columns, discuss inline, and export the results to CSV — all in a single Node.js
container, with SQLite for storage and WebSockets for live collaboration.

- **Zero external services.** SQLite runs inside the container; state persists to a
  volume.
- **Guest sessions.** No accounts — enter a display name and start collaborating.
- **Live updates.** Cards, comments, columns, and drag-and-drop moves broadcast to
  everyone viewing the same board.
- **CSV export.** Download the full board (columns × cards × comments) as CSV.

## Requirements

- Node.js **22.5+** or **24.x** (the server uses the built-in `node:sqlite` module).
- npm 10+.

## Quick start (local dev)

```bash
npm install       # installs backend + client (via postinstall)
npm run dev       # starts backend on :4000 and Vite dev server on :5173
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` and `/socket.io`
to the backend, so hot-reloading works while sockets still flow.

To run the production build against a single Node process:

```bash
npm run build     # builds the React app to client/dist
npm start         # serves the API, WebSocket, and static frontend on :4000
```

Then open **http://localhost:4000**.

## Docker

The provided `Dockerfile` builds a single self-contained image that serves both the
backend API and the compiled React app.

```bash
docker build -t retro-board .
docker run -d --name retro \
  -p 4000:4000 \
  -v retro_data:/data \
  retro-board
```

- The SQLite database lives at `/data/retro.sqlite` inside the container. Map it to a
  volume (as shown) to persist between restarts.
- Configure the port with the `PORT` environment variable and the data directory with
  `DATA_DIR`.

## Scripts

| Command             | Description                                         |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Runs backend and Vite dev server concurrently.      |
| `npm run dev:server`| Runs only the backend (with `node --watch`).        |
| `npm run dev:client`| Runs only the Vite dev server.                      |
| `npm run build`     | Builds the frontend to `client/dist`.               |
| `npm start`         | Runs the backend (serves the built frontend too).   |

## Documentation

- **[docs/api.md](docs/api.md)** — REST endpoints and Socket.io events.
- **[docs/frontend.md](docs/frontend.md)** — Frontend structure, routing, state, and design system.
- **[openspec/changes/realtime-retro-board](openspec/changes/realtime-retro-board)** —
  Original proposal, design decisions, and specs.

## Architecture at a glance

```
┌────────────────────────────────────────────────────────────┐
│                     Browser (React + Vite)                 │
│  React Router · @hello-pangea/dnd · socket.io-client       │
└──────────────────────────────┬─────────────────────────────┘
                               │ HTTPS / WSS
┌──────────────────────────────▼─────────────────────────────┐
│               Node.js (Express + Socket.io)                │
│  REST /api  ·  WebSocket rooms  ·  static /client/dist      │
└──────────────────────────────┬─────────────────────────────┘
                               │ synchronous
┌──────────────────────────────▼─────────────────────────────┐
│                   SQLite (node:sqlite)                     │
│  boards · board_columns · cards · comments  (WAL mode)     │
└────────────────────────────────────────────────────────────┘
```

The Express server is the single source of truth: clients emit socket events, the
server writes to SQLite, then broadcasts the change to everyone joined to the board's
room.
