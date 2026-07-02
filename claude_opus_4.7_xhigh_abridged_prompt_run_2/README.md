# Retro — real-time retrospective boards

A self-hosted, real-time retrospective board for your team. No accounts, no SaaS,
no compromises. Spin up a board, share the link, and start collecting what
actually mattered this sprint.

- **Real-time collaboration** — WebSockets keep every browser in sync as cards
  are added, moved between columns, or commented on.
- **Zero-friction access** — join with just a display name; no OAuth, no email,
  no invitations.
- **Configurable columns** — every board is seeded with *Went Well*, *Needs
  Improvement*, and *Action Items*, and you can add more.
- **Export to CSV** — one click to download the full board (columns, cards, and
  comments) for record-keeping or downstream analysis.
- **Single container** — the entire stack (Express + Socket.io + SQLite +
  React) runs inside one Docker image. Mount a volume at `/data` for
  persistence.

## Quick start (local development)

Prerequisites: **Node.js 20+** and npm.

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

The dev script launches two processes concurrently:

- **`server`** (`http://localhost:4000`) — Express + Socket.io backed by SQLite
- **`client`** (`http://localhost:5173`) — Vite dev server for the React app,
  which proxies `/api` and `/socket.io` to the server

The SQLite database file is created at `data/retro.sqlite`.

## Quick start (Docker)

The project ships with a single-stage `Dockerfile` that builds both the server
and the client and serves them from one process on port `4000`.

```bash
docker build -t retro-board .
docker run --rm -p 4000:4000 -v retro-data:/data --name retro retro-board
```

Open [http://localhost:4000](http://localhost:4000).

The named volume `retro-data` is mounted at `/data` so your boards, cards, and
comments persist across container restarts.

### Environment variables

| Variable   | Default        | Description                                            |
| ---------- | -------------- | ------------------------------------------------------ |
| `PORT`     | `4000`         | Port the HTTP + WebSocket server listens on            |
| `DATA_DIR` | `./data`       | Directory where the SQLite database file is stored     |
| `NODE_ENV` | `development`  | Set to `production` to serve the built client bundle   |

## Project structure

```
.
├── server/                # Node.js backend (Express + Socket.io + SQLite)
│   ├── src/
│   │   ├── db/            # SQLite bootstrap, schema, and repository helpers
│   │   ├── realtime/      # Socket.io event wiring + presence
│   │   ├── routes/        # REST endpoints (mounted under /api/boards)
│   │   ├── export/        # CSV export builder
│   │   └── index.ts       # HTTP server entrypoint
│   └── tsconfig.json
├── client/                # React + Vite frontend
│   ├── src/
│   │   ├── pages/         # HomePage, BoardPage, NotFoundPage
│   │   ├── components/    # Column, Card, Modal, PresenceBar, etc.
│   │   ├── hooks/         # useBoardSocket, useDisplayName
│   │   ├── lib/api.ts     # REST client
│   │   └── styles/        # Global design system tokens
│   └── vite.config.ts
├── docs/
│   ├── API.md             # REST + WebSocket protocol reference
│   └── FRONTEND.md        # Component + state architecture notes
├── Dockerfile
└── package.json           # Backend deps + `npm run dev` orchestration
```

## Scripts

| Script            | What it does                                                          |
| ----------------- | --------------------------------------------------------------------- |
| `npm run dev`     | Runs backend (`tsx watch`) and frontend (`vite`) side by side         |
| `npm run build`   | Builds the client bundle *and* compiles the server to `server/dist`   |
| `npm start`       | Runs the compiled server (expects `NODE_ENV=production`)              |

## Data & privacy

- All data lives in a single SQLite file. Nothing is transmitted to third
  parties.
- Display names are stored only in the browser (`localStorage`) and on any
  cards/comments the user creates. There is no user table.
- To wipe all boards, delete `data/retro.sqlite` (server not running) or the
  mounted Docker volume.

## Further reading

- [`docs/API.md`](docs/API.md) — REST and WebSocket protocol reference
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — component tree and state model
