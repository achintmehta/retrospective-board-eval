# Retro Board

A self-hosted, real-time retrospective board. Teams can create boards, add cards in configurable columns, comment on cards, and watch everything sync live across browsers — no external SaaS required.

**Stack:** Express + Socket.io + SQLite (backend), React + Vite + `@hello-pangea/dnd` (frontend), packaged as a single Docker image.

> Note on language: the original design doc calls for TypeScript end-to-end. The implementation uses plain JavaScript (ES modules) to keep the build pipeline minimal. The shape of the modules matches the design and would port cleanly to TS later.

---

## Quick start (local dev)

Requires Node.js 20+. On first checkout:

```bash
npm install
npm install --prefix server
npm install --prefix client
# or, all-in-one:
npm run install:all
```

Then run both servers with a single command:

```bash
npm run dev
```

This starts:

- **Backend** on http://localhost:4000 (Express API + Socket.io)
- **Frontend** on http://localhost:5173 (Vite dev server, proxies `/api` and `/socket.io` to the backend)

Open http://localhost:5173 and create a board. Open the board URL in a second browser/incognito window to see real-time sync.

The SQLite database lives at `data/retro.sqlite` by default. Override with `DATA_DIR=/some/path`.

---

## Production build

```bash
npm run build       # builds the React client into client/dist
npm start           # runs the Express server, which serves both the API and the built client
```

The server auto-serves `client/dist` if it exists, so a single process handles everything.

---

## Docker

The repo includes a multi-stage `Dockerfile` that builds the client and bundles it with the server:

```bash
docker build -t retro-board .
docker run -p 4000:4000 -v retro-data:/data retro-board
```

Open http://localhost:4000.

The named volume `retro-data` persists the SQLite database across container restarts.

---

## Layout

```
.
├── server/                # Express + Socket.io + sqlite3
│   └── src/
│       ├── index.js       # entry: starts HTTP server, wires routes & sockets
│       ├── db.js          # SQLite init, schema, queries
│       ├── routes.js      # REST API
│       ├── sockets.js     # Socket.io event handlers
│       └── csv.js         # CSV export helper
├── client/                # Vite + React frontend
│   └── src/
│       ├── main.jsx       # bootstrap + Router
│       ├── App.jsx
│       ├── api.js         # REST client
│       ├── session.js     # display-name session helper
│       ├── pages/         # HomePage, BoardPage
│       └── components/    # Column, Card, NamePrompt
├── Dockerfile
├── docs/
│   ├── api.md             # REST + Socket.io event reference
│   └── frontend.md        # Component overview
└── package.json           # root scripts (concurrently)
```

---

## Environment variables

| Var        | Default       | Notes                                  |
| ---------- | ------------- | -------------------------------------- |
| `PORT`     | `4000`        | Backend HTTP port                      |
| `DATA_DIR` | `./data`      | Directory for the SQLite database file |
| `NODE_ENV` | (unset)       | Set to `production` for prod builds    |

---

## Capabilities

- **board-management** — create boards, list boards, configurable columns (3 are seeded by default: *Went Well*, *Needs Improvement*, *Action Items*).
- **collaboration** — guest auth (display name only), real-time card add / move (drag-and-drop) / comment, broadcast to all connected clients.
- **export** — `GET /api/boards/:id/export` streams a CSV with every card and comment on the board.

See `docs/api.md` for the full API and `docs/frontend.md` for a tour of the React components.
