# Retro Board

A self-hosted, real-time retrospective board for team retrospectives. Built with
Node.js + Express + Socket.io on the backend and React + Vite on the frontend,
backed by SQLite for trivial single-container deployment.

## Features

- Create boards with default `Went Well` / `Needs Improvement` / `Action Items` columns
- Add additional columns on the fly
- Add cards to columns, drag and drop cards between columns
- Add nested comments to cards
- Real-time synchronization across all connected clients via WebSockets
- Guest authentication — users join with a display name (per-tab session)
- Export the entire board (columns, cards, comments) as CSV
- Persistent SQLite storage (single file, mounted as a Docker volume)

## Project Layout

```
.
├── server/        Express + Socket.io backend (REST + WS + CSV export)
│   ├── index.js          App entry, HTTP server, static client hosting
│   ├── db.js             SQLite connection + schema bootstrap
│   ├── repository.js     Data access helpers
│   ├── routes.js         REST routes mounted at /api
│   ├── sockets.js        Socket.io event handlers
│   └── csv.js            Board → CSV serializer
├── client/        Vite + React frontend
│   ├── src/pages         Top-level routes (HomePage, BoardPage)
│   ├── src/components    Reusable UI (Column, CardItem, GuestNameModal)
│   ├── src/api.js        REST client
│   ├── src/socket.js     Shared socket.io-client instance
│   └── src/guest.js      Display-name session storage helpers
├── docs/          API + frontend documentation
├── Dockerfile     Multi-stage build (client build, then server image)
└── package.json   Root scripts: dev, build, start
```

## Prerequisites

- Node.js 22.5+ and npm (the server uses the built-in `node:sqlite` module,
  which ships with Node — no native compilation required)

## Local Development

Install dependencies (root + client):

```bash
npm run install:all
```

Run backend and frontend together with hot reload:

```bash
npm run dev
```

- Backend: http://localhost:4000 (REST + Socket.io)
- Frontend (Vite dev server with proxy): http://localhost:5173

Open the frontend in two browser windows to see real-time updates.

## Production Build

```bash
npm run build       # builds the React client into client/dist
SERVE_CLIENT=true npm start
# → server hosts both /api and the static client on port 4000
```

## Docker

```bash
docker build -t retro-board .
docker run -p 4000:4000 -v retro_data:/app/data retro-board
```

The SQLite database file lives at `/app/data/retro.sqlite` — mount a volume to
persist boards across restarts.

## Environment Variables

| Variable       | Default                  | Description                                 |
|----------------|--------------------------|---------------------------------------------|
| `PORT`         | `4000`                   | HTTP port the server listens on             |
| `DATA_DIR`     | `./data`                 | Directory where the SQLite file is created  |
| `DB_PATH`      | `${DATA_DIR}/retro.sqlite` | Override the full SQLite file path        |
| `SERVE_CLIENT` | unset                    | Set to `true` to serve the built React app  |

## Further Reading

- [docs/API.md](docs/API.md) — REST endpoints and Socket.io events
- [docs/FRONTEND.md](docs/FRONTEND.md) — Frontend architecture and components

## License

MIT
