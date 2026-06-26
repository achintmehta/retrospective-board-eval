# Realtime Retro Board

A self-hosted, real-time retrospective board. Node.js + Express + Socket.io on the backend, React (Vite) on the frontend, SQLite for storage. Runs from one `npm run dev` command for development and ships as a single Docker container for deployment.

## Features

- Create and list retrospective boards
- Configurable columns per board (defaults: *Went Well*, *Needs Improvement*, *Action Items*)
- Add cards to columns and drag-and-drop cards between columns
- Nested comments on each card
- Guest sessions — users join with just a display name (no signup)
- Real-time sync across all connected clients via Socket.io rooms
- Export a board's data to CSV with one click
- Single SQLite file, mappable to a Docker volume for persistence

## Quick start (local development)

Requires Node.js **24+** — the server uses the built-in `node:sqlite` module, which is only stable from Node 24 onward.

```bash
npm install          # installs server + client deps
npm run dev          # starts backend on :3001 and Vite dev server on :5173
```

Open http://localhost:5173 in two browsers and you'll see real-time sync in action. Vite proxies `/api` and `/socket.io` traffic to the backend.

## Production / single-container deployment

```bash
npm install
npm run build        # builds the React app into client/dist
npm start            # serves frontend + API + WebSockets on :3001
```

Then visit http://localhost:3001.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/data retro-board
```

The `/data` volume persists `retro.sqlite` across restarts. Override the path with `DATABASE_PATH` if needed.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | HTTP/WebSocket port |
| `DATABASE_PATH` | `./data/retro.sqlite` | SQLite file location |

## Documentation

- [`docs/API.md`](docs/API.md) — REST + Socket.io event reference
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — Frontend architecture and component layout

## Project layout

```
server/        Express + Socket.io backend (ES modules)
  db.js        node:sqlite connection + schema
  repository.js Data access functions
  routes.js    REST routes (mounted at /api)
  sockets.js   Socket.io event handlers
  csv.js       CSV serializer
  index.js     HTTP + Socket.io bootstrap

client/        Vite + React frontend
  src/pages/   HomePage, BoardPage
  src/components/ Column, Card, NamePrompt
  src/api.js   REST client
  src/socket.js Socket.io client singleton
```
