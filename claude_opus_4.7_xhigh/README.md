# Retro Board

A self-hosted, real-time retrospective board. Run it locally with one `npm` command, or ship it as a single Docker container. No SaaS, no signup — users join with a display name and start collaborating.

- **Frontend:** React + Vite, drag-and-drop via `@hello-pangea/dnd`
- **Backend:** Node.js + Express, real-time via `socket.io`
- **Storage:** SQLite (single file under `data/retro.sqlite`)

## Features

- Create retro boards with default columns (Went Well / Needs Improvement / Action Items)
- Add custom columns per board
- Add cards to columns; drag-and-drop them across columns
- Comment on cards (nested replies)
- All changes broadcast in real-time to every client viewing the same board
- Guest sessions: pick a display name, no account required
- Export the entire board (cards + comments) to CSV

## Quick start (local dev)

Requires Node.js 18+.

```bash
# 1. install backend deps + client deps
npm run install:all

# 2. run both backend (Express on :4000) and client (Vite on :5173) concurrently
npm run dev
```

Open http://localhost:5173 in your browser. The Vite dev server proxies `/api` and `/socket.io` traffic to the Express server, so a single tab handles both.

## Production / Docker

Build and run a self-contained image. The SQLite database is mounted at `/app/data` so it survives restarts.

```bash
docker build -t retro-board .
docker run -p 4000:4000 -v retro-data:/app/data retro-board
```

Then visit http://localhost:4000.

To run without Docker:

```bash
npm run install:all
npm run build       # builds client/dist
npm start           # serves API + websocket + static client on :4000
```

## Configuration

| Env var          | Default                  | Description                                        |
|------------------|--------------------------|----------------------------------------------------|
| `PORT`           | `4000`                   | Port the Express + Socket.io server listens on     |
| `DATABASE_FILE`  | `./data/retro.sqlite`    | Path to the SQLite database file                   |

## Project layout

```
.
├── src/                 # Express + Socket.io server
│   ├── index.js         # entry point — wires everything
│   ├── db/              # SQLite connection, schema, repository
│   ├── routes/          # REST endpoints (boards, export)
│   └── sockets/         # Socket.io event handlers
├── client/              # Vite + React frontend
│   └── src/
│       ├── pages/       # HomePage, BoardPage
│       ├── components/  # Column, Card, modals, forms
│       └── hooks/       # useGuestName
├── docs/
│   ├── API.md           # REST + WebSocket reference
│   └── FRONTEND.md      # frontend architecture
├── Dockerfile           # multi-stage build
└── data/                # SQLite file lives here at runtime (gitignored)
```

## Documentation

- [API reference](docs/API.md) — REST endpoints and WebSocket events
- [Frontend architecture](docs/FRONTEND.md) — component layout, state flow

## OpenSpec

The original change proposal, design, specs, and task breakdown for this project live in `openspec/changes/realtime-retro-board/`.
