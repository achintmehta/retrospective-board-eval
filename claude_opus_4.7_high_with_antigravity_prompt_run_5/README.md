# Retro Board

Self-hosted, real-time retrospective board for agile teams. Cards, drag-and-drop columns, nested comments, and CSV export — all backed by a single SQLite file so it runs anywhere a Node process can run.

- ⚡ **Real-time** — Socket.io rooms broadcast every add / move / comment instantly.
- 🎯 **Drag & drop** — `dnd-kit` for smooth, accessible card movement.
- 💾 **Zero-setup storage** — embedded SQLite (WAL mode) keeps data in one file.
- 🔐 **Guest sessions** — pick a display name, no accounts needed.
- 📤 **CSV export** — one click to download the whole board.
- 🐳 **Single Docker container** — frontend + backend served from one image.

---

## Requirements

- **Node.js 22.5 or newer** (Node 24 recommended). The server uses Node's built-in `node:sqlite` module, so there's no native compilation step — `npm install` is fast and never needs a C/C++ toolchain.

## Quick start (local)

```bash
# 1. install dependencies for both server and client
npm run install:all

# 2. start backend + Vite dev server together
npm run dev
```

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:4000>

Vite proxies `/api` and `/socket.io` to the backend, so you only ever open the frontend URL.

## Production build (single process)

```bash
npm run install:all
npm run build        # builds the client to client/dist
npm start            # serves API, Socket.io, and the built client on PORT (default 4000)
```

Then open <http://localhost:4000>.

## Docker

```bash
docker build -t retro-board .
docker run -p 4000:4000 -v $(pwd)/data:/app/data retro-board
```

The SQLite file lives at `/app/data/retro.sqlite`. Mount that as a volume to persist data across container restarts.

| Env var    | Default     | Description                                      |
| ---------- | ----------- | ------------------------------------------------ |
| `PORT`     | `4000`      | Port the unified server listens on               |
| `DATA_DIR` | `./data`    | Directory where `retro.sqlite` is created        |

---

## Project layout

```
.
├── server/                 # Express + Socket.io backend
│   ├── index.js            # HTTP server, static client mount
│   ├── db.js               # node:sqlite connection + schema (no native deps)
│   ├── repository.js       # All DB queries/mutations
│   ├── routes.js           # REST API + CSV export
│   └── realtime.js         # Socket.io event handlers
├── client/                 # Vite + React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css       # Design system tokens
│   │   ├── components/     # Header, Card, Column, GuestAuthModal, AddColumnTile
│   │   ├── pages/          # MainPage, BoardPage
│   │   └── lib/            # api, session, format, boardReducer
│   └── vite.config.js
├── docs/
│   ├── API.md              # REST + WebSocket reference
│   └── FRONTEND.md         # Component map & design system
├── Dockerfile
└── package.json
```

## Documentation

- [API reference](docs/API.md) — every REST endpoint and Socket.io event
- [Frontend overview](docs/FRONTEND.md) — component map and design tokens

## License

MIT
