# Retro — Real-Time Retrospective Boards

A self-hosted, real-time retrospective board for engineering teams. Spin up a
session, share a URL, and watch the team contribute simultaneously — with no
accounts, no SaaS, and no setup beyond `npm install`.

- **Real-time collaboration** over WebSockets (Socket.io) — cards appear,
  move, and gain comments instantly across every connected client.
- **Drag-and-drop** between configurable columns.
- **Guest sessions** — pick a display name, you're in.
- **CSV export** of any board's full contents.
- **One container, one process** — Express serves both the API and the built
  React app; SQLite lives on a single file you can volume-mount.
- **Zero native dependencies** — uses Node 22.5+'s built-in `node:sqlite`.

## Quick start (local)

Requires **Node.js 22.5 or newer** (uses the built-in `node:sqlite` module).

```bash
npm install                # installs server + client deps
npm run dev                # starts backend (4000) + Vite client (5173)
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` and the
WebSocket to the backend automatically.

### Other scripts

| Script             | What it does                                                             |
| ------------------ | ------------------------------------------------------------------------ |
| `npm run dev`      | Run server + client in dev mode (hot reload on both).                    |
| `npm run build`    | Build the client into `client/dist`.                                     |
| `npm start`        | Run the server in production mode (serves the built client + API).       |

After `npm run build && npm start`, everything is served from a single
process at <http://localhost:4000>.

### Environment variables

| Variable      | Default        | Purpose                                                  |
| ------------- | -------------- | -------------------------------------------------------- |
| `PORT`        | `4000`         | Port the backend listens on.                             |
| `HOST`        | `0.0.0.0`      | Interface the backend binds to.                          |
| `DATA_DIR`    | `./data`       | Where the SQLite file (`retro.sqlite`) is stored.        |
| `BACKEND_URL` | `http://localhost:4000` | Used by the Vite dev proxy in `client/vite.config.js`. |

## Run with Docker

```bash
docker build -t retro-board .
docker run --rm -p 4000:4000 -v retro-data:/app/data retro-board
```

The image runs both the API and serves the built React app on port 4000.
The named volume `retro-data` persists the SQLite database across restarts.

## Project layout

```
.
├── server/             Express + Socket.io + SQLite
│   ├── index.js        HTTP server bootstrap, static SPA serving
│   ├── db.js           node:sqlite connection + schema + tx helper
│   ├── repository.js   pure data layer (boards / columns / cards / comments)
│   ├── routes.js       REST endpoints
│   ├── socket.js       Socket.io rooms & event handlers
│   └── csv.js          CSV serialization
├── client/             Vite + React frontend
│   ├── src/
│   │   ├── pages/      HomePage, BoardPage
│   │   ├── components/ Column, Card, CommentList, DisplayNameModal, Toaster
│   │   ├── lib/        api, socket, session, format helpers
│   │   └── styles/     tokens, global, components (vanilla CSS)
│   └── vite.config.js
├── docs/
│   ├── api.md          REST + WebSocket reference
│   └── frontend.md     Frontend architecture
├── Dockerfile          Multi-stage build → single runtime image
└── package.json        Root scripts + backend deps
```

## Data model

```
Board ─┬─ BoardColumn ─┬─ Card ─── Comment*
       │               │
       │               └─ Card ─── Comment*
       └─ BoardColumn ─── Card ─── Comment*
```

- A board is created with three default columns (`Went Well`,
  `Needs Improvement`, `Action Items`); more can be added at any time.
- Cards have a position within their column; positions are renumbered densely
  whenever a card is moved so ordering remains stable across clients.

## Documentation

- [API Reference](./docs/api.md) — REST endpoints + Socket.io events.
- [Frontend Guide](./docs/frontend.md) — component architecture, state, styling.

## License

MIT
