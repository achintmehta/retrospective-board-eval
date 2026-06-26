# Retro — Real-time Retrospective Board

A self-hosted, real-time retrospective board for distributed teams. No SaaS, no sign-ups.
Spin it up locally or as a single Docker container. Cards sync instantly across all
connected clients via WebSockets, comments live on each card, and the whole board
exports to CSV with one click.

- **Backend:** Node.js (ESM) + Express + Socket.io + better-sqlite3
- **Frontend:** React + Vite + `@hello-pangea/dnd`
- **Storage:** SQLite — a single `.db` file you can back up or mount as a Docker volume
- **Auth:** Guest sessions (just enter a display name)

---

## Quick start (local)

Requirements: **Node 18+** (Node 20/22/24 all supported).

```bash
# 1. Install backend + frontend deps
npm install
npm --prefix client install

# 2. Run both servers (Express on :4000, Vite on :5173 with /api + /socket.io proxied)
npm run dev

# 3. Open the app
#    → http://localhost:5173
```

That's it. SQLite is created automatically at `data/retro.db` on first boot.

### Production build

```bash
npm install
npm run build       # builds the React client into client/dist/
npm start           # serves API + static client from one Express server on :4000
```

Open <http://localhost:4000>.

---

## Run with Docker

A single Dockerfile builds both the React client and the Node server and ships them
in one container. SQLite data is written under `/data` inside the container — mount a
volume to persist it across restarts.

```bash
docker build -t retro .
docker run --rm -p 4000:4000 -v retro-data:/data retro
```

Open <http://localhost:4000>.

---

## Project structure

```
.
├── server/                  # Express + Socket.io + SQLite
│   ├── index.js             # boots HTTP + WS server, serves client/dist in prod
│   ├── db.js                # SQLite connection + schema
│   ├── repository.js        # all data access (boards, columns, cards, comments)
│   ├── sockets.js           # socket.io event handlers
│   └── routes/
│       ├── boards.js        # REST: boards & columns
│       └── export.js        # REST: CSV export
├── client/                  # Vite + React app
│   ├── index.html
│   ├── vite.config.js       # proxies /api + /socket.io to :4000 in dev
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── pages/           # HomePage, BoardPage
│       ├── components/      # Column, Card, AddCard, CommentsDrawer, GuestModal, …
│       ├── lib/             # api, socket, session, time helpers
│       └── styles/index.css # design system (dark mode, glassmorphism, animations)
├── Dockerfile
├── package.json             # backend deps + dev/build/start scripts
└── docs/
    ├── API.md               # REST + Socket.io reference
    └── FRONTEND.md          # frontend architecture
```

---

## Configuration

All optional. Set via environment variables:

| Variable    | Default          | Meaning                                            |
|-------------|------------------|----------------------------------------------------|
| `PORT`      | `4000`           | HTTP port for the API + WebSocket + static client. |
| `DATA_DIR`  | `./data`         | Directory that holds `retro.db`.                   |
| `NODE_ENV`  | (unset) / `dev`  | Set to `production` to serve `client/dist` from Express. |

---

## How real-time works

1. Client opens the board → fetches the full snapshot over REST (`GET /api/boards/:id`).
2. Client emits `join_board { boardId, name }` over a Socket.io connection — joining a
   room scoped to that board.
3. Any user action (add card, move card, add comment) is emitted as a Socket.io event.
   The server validates, persists to SQLite, and broadcasts the resulting payload to
   everyone in the room.
4. The server is the single source of truth. On reconnect, the client refetches the
   snapshot to guarantee consistency.

See [docs/API.md](./docs/API.md) for the full event + endpoint reference.

---

## Exporting

Click **Export CSV** on the board toolbar, or `GET /api/boards/:id/export`. The CSV
includes one row per (column × card × comment) tuple, plus header rows for empty
columns/cards, so every board element is represented.

---

## Development tips

- Live-reload: `npm run dev` starts `nodemon` on the server and Vite on the client.
- Reset the database: stop the server and delete `data/retro.db*`.
- The dev Vite server proxies `/api` and `/socket.io` to `localhost:4000`, so you can
  just hit `http://localhost:5173` and forget about CORS.

---

## License

MIT.
