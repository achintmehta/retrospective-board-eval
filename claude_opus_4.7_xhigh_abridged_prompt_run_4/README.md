# Retro — Real-time Retrospective Board

A self-hosted, real-time retrospective board. Create boards, add cards, drag between columns, comment on cards, and export to CSV — all synchronized live over WebSockets. Runs as a single Node.js process backed by SQLite, and ships as a single Docker container.

## Highlights

- **Zero setup** — one database file, one process, one link to share.
- **Real-time** — Socket.io broadcasts card, column, and comment changes to every connected client.
- **Guest sessions** — teammates enter a display name and start collaborating; no accounts.
- **CSV export** — one click to download the entire board as CSV.
- **Single container** — build one Docker image; mount a volume for persistence.

## Quick start (local)

Requires Node.js 20+.

```bash
# 1. Install root + client dependencies
npm run install:all

# 2. Start backend (:3001) and Vite dev server (:5173) together
npm run dev
```

Then open http://localhost:5173.

The Vite dev server proxies `/api` and `/socket.io` to the backend at `http://localhost:3001`.

## Production build

```bash
npm run install:all
npm run build:client
npm start
```

The Express server will serve the built React app from `client/dist` alongside the API and WebSocket endpoints on port 3001.

## Docker

Build and run as a self-contained container. A named volume persists the SQLite database.

```bash
docker build -t retro-board .
docker run -d --name retro \
  -p 3001:3001 \
  -v retro-data:/data \
  retro-board
```

Open http://localhost:3001.

## Environment variables

| Variable          | Default          | Description                                   |
| ----------------- | ---------------- | --------------------------------------------- |
| `PORT`            | `3001`           | HTTP port the server listens on               |
| `NODE_ENV`        | `development`    | Set to `production` to serve `client/dist`    |
| `RETRO_DATA_DIR`  | `./data`         | Directory holding `retro.sqlite`              |
| `VITE_BACKEND_URL`| `http://localhost:3001` | Used by Vite dev proxy in `client/vite.config.js` |

## Data

The SQLite database lives at `<RETRO_DATA_DIR>/retro.sqlite`. In Docker this is `/data/retro.sqlite`. Back it up like any file. WAL mode is enabled for safer concurrent writes.

## Project layout

```
server/       Express API, Socket.io handlers, SQLite access
  index.js
  db.js
  schema.sql
  routes.js
  export.js
  socket.js
client/       Vite + React frontend
  src/
    pages/
    components/
    styles/
docs/
  API.md
  FRONTEND.md
Dockerfile
```

## Documentation

- [API reference](docs/API.md) — REST endpoints and Socket.io events
- [Frontend guide](docs/FRONTEND.md) — component structure and state model

## License

Internal / self-hosted use.
