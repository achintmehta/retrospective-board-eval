# Retro Board

A self-hosted, real-time retrospective board. One Node process serves the React
frontend, the REST API, and the Socket.io stream — backed by a single SQLite
file. Designed to be runnable locally or as a single Docker container with no
external services.

## Features

- Create boards with three default columns (Went Well / Needs Improvement /
  Action Items) and add your own columns at any time.
- Add cards to columns, drag cards across columns, and thread comments on each
  card. All changes are broadcast to every connected client in real time.
- Frictionless guest sessions — pick a display name and you are in.
- Export the full board (columns, cards, comments) to CSV in one click.
- Persists to a single SQLite file (`./data/retro.sqlite` by default).

## Requirements

- Node.js **>= 22.5** (uses the built-in `node:sqlite` module — no native
  compilation required).
- `npm` (ships with Node).

## Local development

```bash
npm install        # installs server + client deps
npm run dev        # starts server on :3000 and Vite dev server on :5173
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` and
`/socket.io` to the backend on `:3000`, so hot reload works for both client and
server code.

## Production build

```bash
npm run build      # compiles server -> dist/, builds client -> client/dist/
npm start          # node dist/index.js (serves API + static client on :3000)
```

Then visit <http://localhost:3000>.

## Docker

```bash
docker build -t retro-board .
docker run -p 3000:3000 -v $(pwd)/data:/data retro-board
```

The `/data` volume holds the SQLite file so data survives container restarts.

## Configuration

| Env var         | Default            | Description                                |
| --------------- | ------------------ | ------------------------------------------ |
| `PORT`          | `3000`             | HTTP port for the combined server.         |
| `DATA_DIR`      | `./data`           | Directory containing `retro.sqlite`.       |
| `DATABASE_FILE` | `$DATA_DIR/retro.sqlite` | Full path override for the database. |

## Project layout

```
.
├── server/        # Express + Socket.io backend (TypeScript)
├── client/        # Vite + React frontend (TypeScript)
├── dist/          # Compiled backend output (after `npm run build`)
├── client/dist/   # Built static frontend (after `npm run build`)
├── docs/          # Additional documentation (API, frontend)
└── Dockerfile     # Multi-stage image: build then runtime
```

## Documentation

- [`docs/api.md`](docs/api.md) — REST + Socket.io reference.
- [`docs/frontend.md`](docs/frontend.md) — React component and state overview.
