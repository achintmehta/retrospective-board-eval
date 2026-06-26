# Realtime Retro Board

A self-hosted, real-time retrospective board. Teams create boards with configurable columns (e.g. *Went Well*, *Needs Improvement*), add cards, drag them between columns, comment on them, and export results — all synchronized live across browsers via WebSockets.

Built as a single, self-contained app: Node.js + Express + Socket.io backend, React (Vite) frontend, SQLite storage.

## Features

- Create and list retro boards from a single page.
- Configurable columns; sensible defaults provisioned per board.
- Real-time card add / move / comment via WebSockets.
- Drag-and-drop cards across columns.
- Guest authentication — just enter a display name to join.
- Export entire board (columns + cards + comments) as CSV.
- Single SQLite file for persistence; runs in one Docker container.

## Project Layout

```
.
├── server/                 Express + Socket.io backend
│   ├── index.js            Entry point (HTTP + Socket.io, static in prod)
│   ├── db.js               better-sqlite3 schema and data helpers
│   ├── routes.js           REST endpoints
│   └── sockets.js          WebSocket event handlers
├── client/                 React (Vite) frontend
│   └── src/
│       ├── pages/          MainPage, BoardPage
│       ├── components/     GuestAuthModal, Column, Card
│       ├── api.js          REST client
│       ├── socket.js       socket.io-client singleton
│       └── styles.css
├── docs/
│   ├── api.md              REST and WebSocket reference
│   └── frontend.md         Frontend architecture notes
├── Dockerfile              Multi-stage build (client + server -> runtime)
└── package.json            Root: backend deps + dev orchestration
```

## Prerequisites

- Node.js 20+ (for native module support; uses `better-sqlite3`)
- npm 10+
- On Windows, native compilation prerequisites for `better-sqlite3` — typically `npm install` handles this via prebuilt binaries.

## Local Development

Install both backend and frontend dependencies:

```bash
npm run install:all
```

Start both servers with a single command:

```bash
npm run dev
```

This runs:
- the Express backend on `http://localhost:3001`
- the Vite dev server on `http://localhost:5173`

The Vite dev server proxies `/api` and `/socket.io` requests to the backend, so open `http://localhost:5173` in your browser.

The SQLite database file lives at `data/retro.sqlite` and is created automatically.

## Production (single container)

Build the production client bundle and start the server:

```bash
npm run build
npm start
```

The Express server then serves the static React bundle from `client/dist` on the same port (`3001` by default). Open `http://localhost:3001`.

### Docker

A self-contained Docker image is provided:

```bash
docker build -t retro-board .
docker run --rm -p 3001:3001 -v retro-data:/app/data retro-board
```

Open `http://localhost:3001`. The SQLite database persists in the `retro-data` volume across restarts.

## Configuration

| Env var       | Default                  | Description                          |
|---------------|--------------------------|--------------------------------------|
| `PORT`        | `3001`                   | HTTP / WebSocket port.               |
| `DB_PATH`     | `./data/retro.sqlite`    | Path to the SQLite database file.    |
| `NODE_ENV`    | _unset_                  | Set to `production` to serve client. |

## Documentation

- [API Reference](docs/api.md) — REST and WebSocket events.
- [Frontend Architecture](docs/frontend.md) — pages, components, state model.

## License

MIT
