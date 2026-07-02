# Retro — Realtime Retrospective Board

A self-hosted, real-time retrospective board. Zero setup: one command runs the whole stack.
Boards sync live across every open tab via WebSockets, and everything persists in a single
SQLite file so a single Docker container is all you need in production.

- Realtime cards, moves, and comments via **Socket.io**
- **SQLite** storage — no separate DB server, single volume mount in Docker
- **Guest sessions** — just enter a display name
- **CSV export** of every card + comment
- Sleek dark UI (React + Vite, Inter/Outfit, subtle gradients & animations)

## Quick start

Requires **Node.js 22.5+** (uses the built-in `node:sqlite` module — no native compile).

```bash
npm install       # installs backend + client
npm run dev       # runs API on :4000 and Vite dev server on :5173 with proxy
```

Then open <http://localhost:5173>. The Vite dev server proxies `/api` and `/socket.io`
to the Express backend, so both HTTP and WebSocket traffic just work.

### Production build

```bash
npm run build     # builds the client into client/dist
npm start         # runs the Express server on :4000 serving both API and SPA
```

### Docker (single container)

```bash
docker build -t retro-board .
docker run -p 4000:4000 -v $PWD/data:/app/data retro-board
```

The container exposes port 4000 and stores its SQLite file in `/app/data`. Mount a
volume there to persist across restarts.

## Project layout

```
server/         Node.js + Express + Socket.io backend
  index.js     app entry, wires REST + realtime + static SPA
  db.js        SQLite schema and CRUD helpers (node:sqlite)
  routes.js    REST endpoints (boards, columns, export)
  realtime.js  Socket.io rooms and event handlers
  export.js    CSV streaming
client/         Vite + React frontend
  src/pages/   HomePage, BoardPage
  src/components/  Column, Card, NameModal, CommentsPanel
  src/styles.css   dark, gradient-heavy visual theme
Dockerfile      Multi-stage build (client build → node:22-alpine runtime)
docs/API.md     REST + WebSocket contract
docs/FRONTEND.md Frontend architecture notes
```

## Configuration

| Env var    | Default          | Purpose                                        |
| ---------- | ---------------- | ---------------------------------------------- |
| `PORT`     | `4000`           | HTTP + WebSocket port                          |
| `DATA_DIR` | `./data`         | SQLite file location (`retro.sqlite` inside)   |

## Data model

- `boards(id, title, created_at)`
- `board_columns(id, board_id, title, position)`
- `cards(id, column_id, content, author_name, position, created_at)`
- `comments(id, card_id, content, author_name, created_at)`

New boards are seeded with three columns — **Went Well**, **Needs Improvement**,
**Action Items** — which you can rename or extend from the board UI.

## License

MIT.
