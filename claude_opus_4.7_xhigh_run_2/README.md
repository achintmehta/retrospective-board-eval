# Realtime Retro Board

A self-hosted, real-time retrospective board. Run it locally or as a single Docker container, no external services required.

- **Backend:** Node.js + Express + Socket.io + SQLite (via `better-sqlite3`)
- **Frontend:** React + Vite + `@hello-pangea/dnd`
- **Storage:** A single SQLite file under `data/retro.sqlite`

## Features

- Create boards, list boards, and configure additional columns on the fly.
- Add cards to columns and drag-and-drop them between columns; changes broadcast to every connected client in real time.
- Nested comments per card with author display name.
- Guest authentication: enter a display name to join (stored in the browser session, no accounts).
- Export an entire board to CSV with one click.

## Prerequisites

- Node.js **18+** (tested through Node 24)
- npm 9+
- Optional: Docker 20+ for the containerised deployment

## Local development

```bash
npm install            # install backend deps
npm --prefix client install   # install frontend deps
npm run dev            # starts backend on :3001 and Vite dev server on :5173
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` and `/socket.io` to the backend, so the experience is identical to production.

`npm run install:all` is a convenience that runs both installs.

### Useful scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Backend (nodemon) + Vite dev server concurrently |
| `npm run dev:server` | Backend only with hot reload |
| `npm run dev:client` | Vite dev server only |
| `npm run build` | Builds the React app into `client/dist` |
| `npm start` | Runs the backend; if `client/dist` exists, it also serves the SPA from `/` |

### Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3001` | Backend HTTP port |
| `DATA_DIR` | `./data` | Directory where the SQLite file is written |
| `DB_PATH` | `${DATA_DIR}/retro.sqlite` | Full path to the SQLite database |
| `VITE_API_TARGET` | `http://localhost:3001` | Used by the Vite dev server to proxy `/api` and `/socket.io` |

## Production (single container)

```bash
docker build -t retro-board .
docker run --rm -p 3001:3001 -v retro-data:/app/data retro-board
```

Then open <http://localhost:3001>. The container:

1. Builds the React app in a `client-build` stage.
2. Installs only runtime backend deps in a `deps` stage.
3. Ships a slim `runtime` image that serves both the REST API, the Socket.io endpoint, and the static SPA on the same port.
4. Persists data via the `/app/data` volume.

## Project layout

```
.
├── server/                 Express + Socket.io backend
│   ├── index.js            App entrypoint, mounts routes + static SPA
│   ├── db.js               SQLite connection + WAL/foreign keys
│   ├── schema.sql          Tables and indexes
│   ├── repository.js       Pure data-access helpers (no HTTP)
│   ├── routes/
│   │   ├── boards.js       /api/boards REST endpoints
│   │   └── export.js       /api/boards/:id/export CSV stream
│   └── sockets.js          Socket.io wiring (join_board, add_card, …)
├── client/                 Vite + React frontend
│   └── src/
│       ├── pages/          MainPage, BoardPage
│       ├── components/     GuestAuthModal, AddCardForm, Card, CommentSection
│       ├── api.js          REST client
│       ├── socket.js       Singleton Socket.io client
│       ├── session.js      Display-name persistence (sessionStorage)
│       └── styles.css      App-wide styles
├── Dockerfile              Multi-stage single-container build
└── docs/
    ├── api.md              REST + Socket.io reference
    └── frontend.md         Component & state guide
```

## Data model

- `boards (id, title, created_at)`
- `board_columns (id, board_id, title, position, created_at)`
- `cards (id, column_id, content, author_name, position, created_at)`
- `comments (id, card_id, content, author_name, created_at)`

WAL mode and `PRAGMA foreign_keys = ON` are enabled at startup. New boards are seeded with three default columns (`Went Well`, `Needs Improvement`, `Action Items`).

## Notes on the implementation

- The server is the source of truth. Clients perform optimistic updates for drag-and-drop, then reconcile when the server broadcast arrives. On reconnect the client re-fetches the board.
- `better-sqlite3` is used in place of `sqlite3` for synchronous, prepared-statement performance; the database file layout is identical and remains portable.
- Display names are scoped to the browser session — refreshing the tab keeps you signed in; closing it forgets you.
