# Retro Board

A self-hosted, real-time retrospective board. Create a board, share the link with your
team, and collaborate on cards live — no signups, no SaaS, no Postgres or Redis.

- **Stack:** Express + Socket.io + Node `node:sqlite` (single-file SQLite, no native build) + React (Vite) + `@hello-pangea/dnd`.
- **Persistence:** A single `.sqlite` file in `./data/` (or `/data` in Docker).
- **Auth:** Guest sessions — pick a display name when you open a board.
- **Export:** Download the whole board as CSV.

## Quick start (local)

```bash
# 1. Install everything (server + client)
npm install   # the postinstall hook installs the client deps too

# 2. Run the dev servers (Express on :4000, Vite on :5173)
npm run dev

# 3. Open http://localhost:5173
```

Vite proxies `/api` and `/socket.io` to `http://localhost:4000`, so the frontend talks
to the backend with no CORS hassle.

### Production-style run (one process)

```bash
npm install
npm run build      # builds client/dist
npm start          # serves API, sockets, AND the React build on :4000
```

Then open <http://localhost:4000>.

## Docker

A single multi-stage Dockerfile builds the React client and packages it with the
server. SQLite data lives in `/data`, which is mounted as a volume:

```bash
docker build -t retro-board .
docker run --rm -p 4000:4000 -v retro-data:/data --name retro retro-board
```

Open <http://localhost:4000>. The SQLite file persists in the `retro-data` volume
across container restarts.

## How it works

| Concern | Where |
| --- | --- |
| HTTP REST API | `server/routes.js` (`/api/*`) |
| Realtime events | `server/sockets.js` (Socket.io `join_board`, `add_card`, `move_card`, `add_comment`) |
| SQLite schema + queries | `server/db.js`, `server/repository.js` |
| Static React build | served by `server/index.js` when `client/dist/index.html` exists |
| React UI | `client/src/**` |

Server is the source of truth: clients emit an action, the server writes to SQLite,
then broadcasts the resulting payload to everyone in the board's room
(`board:<boardId>`). On reconnect the client re-joins and re-fetches the board to
stay consistent.

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | HTTP / WebSocket port |
| `DATA_DIR` | `./data` | Directory that holds the SQLite database |
| `DB_FILE` | `<DATA_DIR>/retro.sqlite` | Override the full SQLite path |
| `CLIENT_DIST` | `<repo>/client/dist` | Directory containing the built React app |

## More docs

- [`docs/api.md`](docs/api.md) — REST + WebSocket reference
- [`docs/frontend.md`](docs/frontend.md) — React app structure
