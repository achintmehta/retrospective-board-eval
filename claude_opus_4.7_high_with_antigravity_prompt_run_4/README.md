# Retro — realtime retrospective board

A self-hosted, real-time retrospective board. Spin one up, share the link, and run a retro
where teammates add cards, drag them between columns, and comment in real time — all
backed by a single SQLite file you can mount as a Docker volume.

## Features

- **Real-time collaboration** — cards, comments, and drag-and-drop sync instantly over WebSockets.
- **Configurable columns** — seeded with *Went Well / Needs Improvement / Action Items*; add more on the fly.
- **Nested comments** — start a thread under any card.
- **Guest sessions** — no accounts, no SSO. Pick a display name and join.
- **CSV export** — one click to download the entire board.
- **One container** — Node.js + React + SQLite in a single Docker image.

## Tech stack

| Layer       | Technology                                |
| ----------- | ----------------------------------------- |
| Frontend    | React 18, React Router, Vite              |
| Drag & drop | `@hello-pangea/dnd`                       |
| Realtime    | `socket.io` / `socket.io-client`          |
| Backend     | Node.js 18+, Express                      |
| Database    | SQLite via Node 22+ built-in `node:sqlite` (WAL mode) |
| Packaging   | Single multi-stage Dockerfile             |

## Quick start (local)

```bash
# install backend + frontend deps
npm run install:all

# start both backend (4000) and Vite dev server (5173) at once
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` and `/socket.io` to the
backend on port `4000`, so a single command boots the full stack.

### Production build (no Docker)

```bash
npm run install:all
npm run build      # builds the React client into client/dist
npm start          # backend serves the built client on port 4000
```

Then open <http://localhost:4000>.

## Run with Docker

```bash
docker build -t retro-board .
docker run -p 4000:4000 -v retro-data:/data retro-board
```

Open <http://localhost:4000>. Data persists in the named volume `retro-data`.

## Environment

| Variable    | Default                  | Purpose                                        |
| ----------- | ------------------------ | ---------------------------------------------- |
| `PORT`      | `4000`                   | Port the backend listens on                    |
| `DATA_DIR`  | `./data` (or `/data`)    | Directory where `retro.sqlite` is stored       |
| `DB_PATH`   | `${DATA_DIR}/retro.sqlite` | Override the full DB file path               |

## Documentation

- [API reference](docs/API.md) — REST endpoints + Socket.io events.
- [Frontend guide](docs/FRONTEND.md) — folder layout, state model, real-time wiring.

## Project layout

```
.
├── server.js               # Express + Socket.io entry point
├── src/
│   ├── db/                 # SQLite connection, schema, repository
│   ├── routes/             # REST endpoints
│   ├── sockets/            # Socket.io event handlers
│   └── utils/              # CSV serialization
├── client/                 # Vite + React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── api.js
│       └── socket.js
└── Dockerfile
```

## Notes on storage

The backend uses **`node:sqlite`**, the SQLite binding built into Node.js since v22.5.
This avoids a native-module compile step entirely, so `npm install` just works on every
platform (Windows / macOS / Linux) without Visual Studio, Xcode, or node-gyp. WAL mode
is enabled so multiple Socket.io handlers can read while a write is in flight, which
keeps the experience snappy for team-sized retrospectives.

> **Heads up:** `node:sqlite` is marked *experimental* in Node 22.x and emits a startup
> warning. You can silence it with `NODE_NO_WARNINGS=1 npm start` if it bothers you.

## License

MIT — do whatever you like.
