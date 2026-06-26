# Retro Board

A self-hosted, real-time retrospective board with collaborative columns, cards, nested comments, drag-and-drop, and CSV export. Backend is Node.js + Express + Socket.io; the React frontend is built with Vite. Persistence is a single SQLite file — no external services.

## Requirements

- Node.js **22.5+** (Node 24 recommended — uses the built-in `node:sqlite` module, no native compile)
- npm 10+

## Quick start (local development)

```sh
npm install            # also installs the client via postinstall
npm run dev            # starts backend (3001) and Vite frontend (5173)
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` and WebSocket traffic to the backend.

The SQLite database file lives at `./data/retro.sqlite` (override the location with `DATA_DIR`).

## Production / single-container

```sh
npm install
npm run build          # produces client/dist
npm start              # serves API + WebSocket + static client on port 3001
```

Open <http://localhost:3001>.

## Docker

A single image builds the client and runs the Node server. The SQLite file is stored in a `/data` volume:

```sh
docker build -t retro-board .
docker run --rm -p 3001:3001 -v retro-data:/data retro-board
```

## Configuration

| Env var     | Default                         | Description                          |
| ----------- | ------------------------------- | ------------------------------------ |
| `PORT`      | `3001`                          | HTTP port the server listens on      |
| `DATA_DIR`  | `./data` (`/data` in container) | Where the SQLite file is stored      |

## Architecture

```
┌─────────────────┐   HTTP /api/*      ┌──────────────────┐
│  React (Vite)   │ ─────────────────► │  Express routes  │
│   client/       │   WebSocket        │   src/routes.js  │
│   ─ MainPage    │ ◄════════════════► │   src/sockets.js │
│   ─ BoardPage   │   socket.io        │   src/export.js  │
└─────────────────┘                    └─────────┬────────┘
                                                 │
                                          ┌──────▼──────┐
                                          │  node:sqlite │
                                          │   src/db.js  │
                                          └──────────────┘
```

The server is the source of truth. Clients emit socket events; the server persists to SQLite and broadcasts back to everyone in the board's room (`board:<boardId>`).

## Documentation

- [docs/api.md](docs/api.md) – REST and WebSocket reference
- [docs/frontend.md](docs/frontend.md) – Client-side guide

## Project layout

```
src/                   Backend (Node + Express + Socket.io)
  index.js             Bootstrap: routes, sockets, static, listen
  db.js                node:sqlite setup, schema, repository
  routes.js            REST endpoints
  sockets.js           join_board, add_card, move_card, add_comment
  export.js            GET /api/boards/:id/export
client/                React app (Vite)
  index.html
  vite.config.js
  src/
    main.jsx
    App.jsx            React Router setup
    api.js             REST client
    socket.js          socket.io-client singleton
    pages/
      MainPage.jsx     List/create boards
      BoardPage.jsx    Realtime board UI
    components/
      Column.jsx
      Card.jsx
      GuestAuthModal.jsx
    styles.css
Dockerfile             Multi-stage build (client build → runtime)
openspec/              Spec-driven change docs
```

## Notes

- Default columns ("Went Well", "Needs Improvement", "Action Items") are seeded automatically on board creation. Add more from the board page.
- Display name is persisted in `localStorage` per browser.
- Comments are visible by expanding a card via the "Comment" / "N comments" toggle.
