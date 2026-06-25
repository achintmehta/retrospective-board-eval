# Retroflow — Real-time Retrospective Board

A self-hosted retrospective board with live collaboration. Express + Socket.io on the
backend, Vite + React on the frontend, SQLite for storage. No external services, no
accounts — just a display name and you're in.

## Features

- **Real-time** card additions, drag-and-drop moves, and nested comments via WebSockets.
- **Configurable columns** — boards ship with sensible defaults (Went Well / To Improve /
  Action Items) and you can add more on the fly.
- **Guest sessions** — pick a display name on entry; no login required.
- **CSV export** — one-click download of every column, card, and comment.
- **Single-container deployment** — SQLite means the entire app runs from one Docker image.

## Quick Start (local)

Requires **Node.js 22.5+** — the server uses Node's built-in `node:sqlite` module, so there are no native dependencies to compile (no Visual Studio / build-essentials required).

```bash
# Install dependencies for both server and client
npm run install:all

# Start both the API server and the Vite dev server
npm run dev
```

Then open <http://localhost:5173>. The Vite dev server proxies `/api` and `/socket.io`
to the backend on port 4000.

## Production Build

```bash
npm run build        # builds the React client into client/dist
npm start            # serves API + static client on http://localhost:4000
```

## Docker

```bash
docker build -t retroflow .
docker run -p 4000:4000 -v retroflow-data:/data retroflow
```

The `/data` volume holds `retro.sqlite` — mount it to persist boards across restarts.

## Configuration

| Variable   | Default | Description                              |
| ---------- | ------- | ---------------------------------------- |
| `PORT`     | `4000`  | HTTP port for Express + Socket.io        |
| `DATA_DIR` | `./data`| Directory holding the SQLite database    |

## Project Layout

```
server/        Express API + Socket.io handlers
  index.js     Server entrypoint
  routes.js    REST endpoints (boards, columns, export)
  sockets.js   Real-time event handlers
  db.js        SQLite connection, schema, and queries
client/        Vite + React app
  src/
    pages/         MainPage, BoardPage
    components/    Column, Card, GuestAuthModal
    lib/           api, socket, guestSession
    styles/        index.css (design tokens + components)
docs/          API and frontend documentation
```

## Documentation

- [API Reference](docs/api.md)
- [Frontend Architecture](docs/frontend.md)

## License

MIT
