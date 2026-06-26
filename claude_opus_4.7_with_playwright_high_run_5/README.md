# Retro Board

A self-hosted real-time retrospective board. Create boards with configurable columns, drop cards into them, thread comments on cards, and watch updates appear instantly for everyone in the room.

Designed to run trivially:
- One command for local dev (`npm run dev`).
- One Docker image for self-hosting — no `docker-compose`, no external DB.

## Stack

- **Backend**: Node.js + Express + Socket.io
- **Database**: SQLite (via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3), WAL mode)
- **Frontend**: React + Vite + `@hello-pangea/dnd` for drag-and-drop
- **Real-time**: Socket.io rooms keyed by `boardId`

> Note: the proposal mentions the `sqlite3` driver; we use `better-sqlite3` because it is the modern, synchronous, well-maintained successor. The on-disk format and `.sqlite` file are identical.

## Quick Start (local dev)

Requires Node.js 20+.

```bash
# Install root + client deps
npm run install:all

# Start backend (port 3001) and Vite dev server (port 5173) together
npm run dev
```

Then open <http://localhost:5173>. The Vite dev server proxies `/api` and `/socket.io` to the backend.

The SQLite file is created at `./data/retro.sqlite` on first run.

## Production (single Node process)

```bash
npm run install:all
npm run build      # builds client/ into client/dist
npm start          # serves API + static client on PORT (default 3001)
```

Then open <http://localhost:3001>.

## Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/data retro-board
```

A named volume (`retro-data`) keeps the SQLite database across container restarts.

Environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3001` | Port to bind |
| `DATA_DIR` | `./data` (dev), `/data` (Docker) | Where `retro.sqlite` lives |
| `NODE_ENV` | unset | Set to `production` to serve `client/dist` |

## How it works

1. Open the main page, create a board (gets three default columns).
2. Visit `/boards/:id` and enter a display name — it's stored in `localStorage`.
3. The browser connects via Socket.io and joins the room `boardId`.
4. Add a card, drag it across columns, or comment on it. Each action emits a Socket.io event, the server writes to SQLite, and broadcasts the change to everyone in the room.
5. Click **Export CSV** for a flat dump of every column / card / comment.

See [`docs/API.md`](docs/API.md) for HTTP + WebSocket protocol and [`docs/FRONTEND.md`](docs/FRONTEND.md) for the React structure.

## Repository layout

```
/
├── server/                  # Express + Socket.io backend
│   ├── index.js             # Server entry; mounts routes + sockets + static
│   ├── db.js                # SQLite init + schema
│   ├── dao.js               # Pure query / mutation helpers
│   ├── routes.js            # REST endpoints + CSV export
│   └── sockets.js           # Real-time event handlers
├── client/                  # Vite + React frontend
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx         # Router setup
│       ├── App.jsx          # Layout shell
│       ├── api.js           # REST client
│       ├── session.js       # Display-name persistence
│       ├── styles.css
│       ├── pages/MainPage.jsx
│       ├── pages/BoardPage.jsx
│       └── components/{GuestNameModal,CommentsPanel}.jsx
├── docs/
│   ├── API.md
│   └── FRONTEND.md
├── Dockerfile
└── package.json
```
