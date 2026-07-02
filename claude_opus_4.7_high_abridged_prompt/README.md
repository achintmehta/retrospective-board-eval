# Retro Board

A self-hosted, real-time retrospective board. Zero SaaS, zero external services
— just Node, SQLite, and a React frontend, all served from a single Node
process (or a single Docker container).

- Realtime sync over WebSockets (Socket.io)
- Drag-and-drop cards between columns
- Nested comments on each card
- Guest sessions — pick a display name and go
- Export a whole board to CSV
- Persists to a single SQLite file

## Quick start (local dev)

Requires Node.js ≥ 18.

```bash
npm run install:all      # install root + client dependencies
npm run dev              # runs backend (:4000) + Vite dev server (:5173)
```

Then open http://localhost:5173. The Vite dev server proxies `/api` and
`/socket.io` traffic to the backend on port 4000.

## Production (single-process)

```bash
npm run install:all
npm run build            # builds the React client into client/dist
npm start                # serves API + static frontend on :4000
```

Open http://localhost:4000.

## Docker (single-container)

```bash
docker build -t retro-board .
docker run -p 4000:4000 -v retro-data:/data retro-board
```

The SQLite database lives at `/data/retro.sqlite` inside the container. Mounting
a named volume (or a host directory) at `/data` keeps boards across restarts.

## Configuration

| Env var    | Default              | Purpose                      |
|------------|----------------------|------------------------------|
| `PORT`     | `4000`               | HTTP + WebSocket port        |
| `DATA_DIR` | `./data` (dev) `/data` (docker) | SQLite storage location |

## Project layout

```
.
├── server/                # Express + Socket.io backend (ESM)
│   ├── index.js           # entrypoint (HTTP + WS + static)
│   ├── db.js              # SQLite connection + schema
│   ├── repository.js      # data-access helpers
│   ├── routes.js          # REST endpoints (/api/*)
│   └── sockets.js         # realtime event handlers
├── client/                # Vite + React frontend (TypeScript)
│   └── src/
│       ├── pages/         # HomePage, BoardPage
│       ├── components/    # NameModal, CommentsDrawer
│       ├── api.ts         # REST helpers
│       ├── socket.ts      # socket.io-client singleton
│       └── index.css      # design system
├── docs/
│   ├── api.md             # REST + WebSocket contract
│   └── frontend.md        # frontend architecture
├── Dockerfile
└── package.json
```

## Documentation

- [`docs/api.md`](docs/api.md) — REST + WebSocket API contract
- [`docs/frontend.md`](docs/frontend.md) — Frontend architecture and design system
