# Retro

> Self-hosted, real-time retrospective board for agile teams.
> React + Vite frontend, Node/Express + Socket.io backend, SQLite storage,
> all packaged in a single Docker container.

Create boards, add columns, drop sticky notes, drag them between columns,
comment on cards, and watch every change appear live on everyone else's
screen — no sign-up, no SaaS dependency.

## Features

- **Real-time collaboration** — Socket.io broadcasts `card_added`,
  `card_moved`, and `comment_added` events to everyone on the board.
- **Drag-and-drop cards** between columns with `@hello-pangea/dnd`.
- **Guest sessions** — enter a display name and you're in (no accounts).
- **Configurable columns** — every new board ships with the classic
  *Went Well · To Improve · Action Items*, and you can add more.
- **Nested comments** on every card.
- **CSV export** for the whole board (columns, cards, comments).
- **SQLite (WAL mode)** — single file, mount a Docker volume to persist.

## Quick start (local development)

```bash
# 1. Install all dependencies (server + client)
npm install

# 2. Start backend (4000) and Vite dev server (5173) together
npm run dev
```

Then open <http://localhost:5173>. The Vite dev server proxies `/api`
and `/socket.io` to `http://localhost:4000`.

> If you only want one process, use `npm run server` and `npm run client`
> separately.

### Requirements

- Node.js 18 or newer (Node 20 LTS recommended)
- npm 9+

`better-sqlite3` ships prebuilt binaries for most platforms. On Windows you
may need the *Desktop development with C++* workload from Visual Studio
Build Tools if a prebuilt binary isn't available for your Node version.

## Production build

```bash
# Build the React client into client/dist
npm run build

# Serve the API and the built client from one Express process on :4000
NODE_ENV=production npm start
# (Windows PowerShell)
$env:NODE_ENV='production'; npm start
```

When `client/dist` exists, the Express server mounts it as static assets
and falls back to `index.html` for any non-`/api`, non-`/socket.io` route
(so React Router works on hard refresh).

## Docker

```bash
# Build the image
docker build -t retro-board .

# Run it (data persisted in ./retro-data)
docker run -d \
  --name retro-board \
  -p 4000:4000 \
  -v "$(pwd)/retro-data:/data" \
  retro-board
```

Open <http://localhost:4000> — the React client is served straight from
Express, and the SQLite file lives at `/data/retro.sqlite` inside the
container.

## Project layout

```
.
├── server.js              Express + Socket.io entry
├── server/
│   ├── db.js              SQLite connection & schema
│   ├── store.js           Query/mutation helpers
│   ├── routes.js          REST API
│   ├── csv.js             CSV builder for export
│   └── sockets.js         Real-time event handlers
├── client/                Vite + React frontend
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js         Fetch wrapper for REST API
│       ├── socket.js      socket.io-client singleton
│       ├── useDisplayName.js
│       ├── pages/         MainPage, BoardPage
│       └── components/    GuestAuthModal, Column, Card
├── docs/
│   ├── api.md             REST + WebSocket reference
│   └── frontend.md        Frontend architecture
├── Dockerfile             Single-container build
└── openspec/              Change proposal & specs
```

## Configuration

| Variable          | Default                 | Purpose                                    |
| ----------------- | ----------------------- | ------------------------------------------ |
| `PORT`            | `4000`                  | HTTP port for the Express server           |
| `RETRO_DATA_DIR`  | `./data`                | Directory that holds the SQLite database   |
| `RETRO_DB_PATH`   | `<DATA_DIR>/retro.sqlite` | Override the full SQLite path            |

## Further reading

- [docs/api.md](docs/api.md) — REST endpoints and Socket.io events
- [docs/frontend.md](docs/frontend.md) — component structure & design system
- [openspec/changes/realtime-retro-board](openspec/changes/realtime-retro-board/) — original proposal and specs
