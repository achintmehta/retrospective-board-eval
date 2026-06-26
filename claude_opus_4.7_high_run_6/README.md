# Retro Board

A self-hosted, real-time retrospective board you can run locally or as a single
Docker container. Built with Node.js + Express, React (via Vite), SQLite, and
Socket.io.

- Create boards with configurable columns
- Add cards and threaded comments
- Drag-and-drop cards between columns, synced in real time
- Guest "display name" sessions — no signup or SSO
- Export any board to CSV

## Quick start (local development)

Requires Node.js **22.5+** (the server uses the built-in `node:sqlite`
module — no native compilation, no extra build tools).

```bash
npm install        # installs server + client dependencies
npm run dev        # starts the API on :3001 and the Vite dev server on :5173
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` and
`/socket.io` to the Express backend, so the same code path works in dev and
in production.

## Production build

```bash
npm run build      # bundles the client into client/dist
npm start          # serves the API + the built client from port 3001
```

Then open <http://localhost:3001>.

## Run with Docker

The image is self-contained — it bundles the API and the built client and
persists data to a mounted volume.

```bash
docker build -t retro-board .
docker run --rm -p 3001:3001 -v retro-data:/app/data retro-board
```

Open <http://localhost:3001>. The SQLite database lives at `/app/data/retro.sqlite`
inside the container and on the `retro-data` volume on the host.

## Environment variables

| Variable        | Default                       | Purpose                                              |
| --------------- | ----------------------------- | ---------------------------------------------------- |
| `PORT`          | `3001`                        | Port the Express server listens on.                  |
| `DATA_DIR`      | `./data`                      | Directory for the SQLite database file.              |
| `DB_FILE`       | `<DATA_DIR>/retro.sqlite`     | Override the SQLite file path directly.              |
| `CLIENT_ORIGIN` | `http://localhost:5173`       | CORS / Socket.io allowed origin for dev.             |

## Project layout

```
.
├── server/                  Express + Socket.io backend
│   ├── index.js             Server entrypoint, wires REST + WS + static
│   ├── db.js                SQLite schema + data-access helpers
│   ├── routes.js            REST endpoints (boards, columns, CSV export)
│   └── sockets.js           Realtime event handlers
├── client/                  React + Vite frontend
│   └── src/
│       ├── pages/           Top-level routes (HomePage, BoardPage)
│       ├── components/      Reusable UI (columns, cards, modal, forms)
│       ├── api.js           REST client
│       ├── socket.js        Socket.io client singleton
│       └── guestSession.js  Display-name persistence (sessionStorage)
├── docs/                    API and frontend documentation
├── Dockerfile               Multi-stage build (client + server in one image)
└── package.json             Root scripts (concurrent dev server, build, start)
```

## Documentation

- [API reference](docs/api.md)
- [Frontend architecture](docs/frontend.md)
