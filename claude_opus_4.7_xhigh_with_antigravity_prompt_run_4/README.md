# RetroFlow

A self-hosted, real-time retrospective board. Spin it up locally or as a single Docker container,
share the link, and run honest team retros without giving your data to a SaaS.

- Live multi-user collaboration over WebSockets (Socket.io)
- Configurable columns (defaults: *Went Well*, *To Improve*, *Action Items*)
- Drag-and-drop cards between columns
- Nested comments on every card
- Guest sign-in by display name — no accounts, no OAuth
- One-click CSV export of an entire board
- Single SQLite file, persisted to a Docker volume

---

## Quick start (local dev)

### Prerequisites

- **Node.js 22.5 or newer.** RetroFlow uses Node's built-in `node:sqlite` module (no native compilation needed).
- **npm** (bundled with Node).

### Install & run

```bash
# 1. Install backend + frontend dependencies
npm run install:all

# 2. Start the API (port 3001) and the Vite dev server (port 5173) together
npm run dev
```

Open <http://localhost:5173>. Create a board, share its URL with a teammate, and watch their
cards appear as they type.

### What `npm run dev` does

| Process | Port | Purpose |
| --- | --- | --- |
| `dev:server` | 3001 | Express + Socket.io API, watched by nodemon |
| `dev:client` | 5173 | Vite dev server with HMR; proxies `/api` and `/socket.io` to 3001 |

---

## Production build

```bash
npm run build            # builds the React client into client/dist
npm start                # runs the API and serves the built client from the same port
```

The single Node process now serves both the API and the static client on **port 3001**.

### Docker (single self-contained container)

```bash
docker build -t retroflow .
docker run -p 3001:3001 -v retro-data:/data retroflow
```

The SQLite database lives at `/data/retro.sqlite` inside the container; the `retro-data`
named volume keeps it across restarts. Open <http://localhost:3001>.

---

## Configuration

The server reads a handful of optional environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | HTTP port to listen on |
| `DB_PATH` | `./data/retro.sqlite` (local) / `/data/retro.sqlite` (Docker) | SQLite file location |

---

## Project layout

```
.
├── src/                  # Backend (Express + Socket.io + node:sqlite)
│   ├── server.js         # HTTP + Socket.io bootstrap
│   ├── db.js             # SQLite connection + schema
│   ├── repository.js     # Data access (boards, columns, cards, comments)
│   ├── routes/boards.js  # REST endpoints
│   ├── sockets.js        # Real-time event handlers
│   └── csv.js            # CSV serialization for the export endpoint
├── client/               # Frontend (Vite + React + @hello-pangea/dnd)
│   └── src/
│       ├── App.jsx
│       ├── pages/        # HomePage, BoardPage, NotFoundPage
│       ├── components/   # Column, Card, modals, ...
│       └── styles/       # Design system (CSS)
├── Dockerfile            # Multi-stage build (Node 22 alpine)
└── docs/                 # API.md and FRONTEND.md
```

For deeper details see:

- [`docs/API.md`](docs/API.md) — REST endpoints and Socket.io events
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — Frontend architecture and design tokens

---

## Troubleshooting

- **`SyntaxError: Unknown experimental option --experimental-sqlite`**: you're on Node < 22.5.
  Upgrade to Node 22.5+ (or 24+ where it is stable).
- **Port already in use**: `PORT=4000 npm start` or stop the conflicting process.
- **Lost the database?** It's just a file — back up `data/retro.sqlite`.

---

## License

MIT.
