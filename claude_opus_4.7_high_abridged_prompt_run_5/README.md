# Retro — Real-Time Retrospective Board

A self-hosted, collaborative retrospective board with real-time sync, guest
sessions, and CSV export. Runs locally with a single `npm run dev`, or as one
self-contained Docker container.

## Stack

- **Backend:** Node.js + Express + Socket.io
- **Database:** SQLite (via `better-sqlite3`, WAL mode)
- **Frontend:** React 18 + Vite, drag-and-drop via `@hello-pangea/dnd`
- **Realtime:** WebSockets over Socket.io rooms (`board:<id>`)

## Quick Start (Local)

```bash
# One-time install (root + client)
npm run install:all

# Start server (:4000) and Vite dev server (:5173) together
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the Vite dev server
proxies `/api` and `/socket.io` to the backend automatically.

### Production Build

```bash
npm run build      # bundles the client into client/dist
npm start          # serves API + static SPA on :4000
```

## Docker

Everything ships as one container. SQLite data lives on a mounted volume so
your boards persist across restarts.

```bash
docker build -t retro-board .
docker run -p 4000:4000 -v retro-data:/app/data retro-board
```

Then visit [http://localhost:4000](http://localhost:4000).

## Environment

| Variable   | Default          | Description                           |
| ---------- | ---------------- | ------------------------------------- |
| `PORT`     | `4000`           | HTTP port the server binds to         |
| `DATA_DIR` | `./data`         | Directory that holds `retro.sqlite`   |

## Documentation

- [API reference](./docs/API.md) — REST + Socket.io events
- [Frontend guide](./docs/FRONTEND.md) — architecture, state, styling

## Feature Overview

- Create boards with default columns (**Went Well**, **Needs Improvement**,
  **Action Items**) or add your own custom columns with color-coding.
- Guest auth — enter a display name once and go.
- Real-time card add, drag-and-drop reorder / cross-column move, and threaded
  comments — every action is broadcast to all connected clients instantly.
- Presence toasts when teammates join or leave.
- Export the entire board (columns + cards + comments) to CSV in one click.
