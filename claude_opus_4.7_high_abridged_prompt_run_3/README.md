# Retro — real-time retrospective board

A self-hosted, single-container retrospective board with live sync, drag-and-drop cards, nested comments, and CSV export. No accounts, no clutter — enter a display name and you're in.

## Highlights

- **Real-time collaboration** — cards, moves, and comments propagate to every open client via WebSockets.
- **Guest sessions** — join with just a display name; persisted in `localStorage`.
- **Configurable columns** — each new board seeds with "Went Well", "Needs Improvement", "Action Items", and you can add more.
- **Drag-and-drop** — reorder or move cards across columns; positions persist in SQLite.
- **CSV export** — one click, one file, streamed from the server.
- **Single-container Docker** — SQLite file mounted on a volume; no Postgres, no Redis, no compose files.

## Stack

| Layer     | Tech                                        |
|-----------|---------------------------------------------|
| Frontend  | React 18 + Vite + TypeScript, `@hello-pangea/dnd`, `socket.io-client` |
| Backend   | Node.js + Express + Socket.io, TypeScript    |
| Storage   | SQLite via Node's built-in `node:sqlite`, WAL mode |
| Realtime  | Socket.io rooms keyed by `board:<id>`       |

## Quick start (local dev)

Requires **Node 22.5+** (uses the built-in `node:sqlite` module — no native compilation needed). Node 24.x is recommended.

```bash
# From the repo root
npm run install:all        # installs root + server + client deps
npm run dev                # runs backend on :4000 and frontend on :5173
```

Then open <http://localhost:5173>. Vite proxies `/api` and `/socket.io` to the backend.

## Production build (single process)

```bash
npm run build
npm run start
# → serves the built React bundle from the same Express process on :4000
```

## Docker (single container)

```bash
docker build -t retro-board .
docker run -d --name retro -p 4000:4000 -v retro-data:/data retro-board
# App: http://localhost:4000  (SQLite file lives at /data/retro.sqlite)
```

## Environment variables

| Variable     | Default                       | Purpose                                    |
|--------------|-------------------------------|--------------------------------------------|
| `PORT`       | `4000`                        | HTTP + WebSocket port                      |
| `DATA_DIR`   | `<cwd>/data`                  | Directory that holds `retro.sqlite`        |
| `STATIC_DIR` | `../client/dist` (dev build)  | Directory containing the built React app   |

## Repo layout

```
/                 root scripts, Dockerfile
/server           Express + Socket.io + SQLite
/client           React + Vite
/docs             API and frontend reference
/openspec         change proposals & specs (this feature under `realtime-retro-board`)
```

## Documentation

- [`docs/API.md`](docs/API.md) — REST endpoints and Socket.io event contracts.
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — client architecture, state model, and design notes.
