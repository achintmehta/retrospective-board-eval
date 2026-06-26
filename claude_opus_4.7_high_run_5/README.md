# Retro Board

A self-hosted, real-time retrospective board for teams. Create boards with
configurable columns ("Went Well", "Needs Improvement", "Action Items"), add
cards, drop in nested comments, drag cards between columns, and export the
whole board to CSV when you're done. All updates broadcast live to every
connected participant via WebSockets.

- **Backend:** Node.js + Express + Socket.io + SQLite (via `better-sqlite3`)
- **Frontend:** React (Vite) + `@hello-pangea/dnd` + `socket.io-client`
- **Auth:** Lightweight guest sessions — just enter a display name to join
- **Persistence:** Single SQLite file, perfect for a single-container deploy

## Quick start (local dev)

```bash
# install backend + frontend deps
npm run install:all

# run backend + frontend with hot reload
npm run dev
```

- Frontend (Vite): http://localhost:5173
- Backend (Express + Socket.io): http://localhost:3001

The Vite dev server proxies `/api` and `/socket.io` to the backend, so the
frontend can be developed against a live API without CORS dances.

## Production build

```bash
# build the frontend into client/dist
npm run build

# start the server, which serves the API, websockets, and the built frontend
npm start
```

Then open http://localhost:3001.

## Docker

The included `Dockerfile` builds the frontend and packages it together with
the backend in a single container.

```bash
docker build -t retro-board .
docker run -d --name retro-board \
  -p 3001:3001 \
  -v retro-board-data:/data \
  retro-board
```

The SQLite database lives in `/data` inside the container; mount a named
volume (as above) to persist boards between restarts.

### Environment variables

| Variable    | Default         | Description                         |
| ----------- | --------------- | ----------------------------------- |
| `PORT`      | `3001`          | HTTP port for the server            |
| `DATA_DIR`  | `./data`        | Directory for the SQLite file       |
| `DB_FILE`   | `$DATA_DIR/retro.sqlite` | Full path to the SQLite file |

## Project layout

```
.
├── server/            # Express + Socket.io backend
│   ├── index.js       # HTTP/Socket.io server bootstrap
│   ├── routes.js      # REST endpoints
│   ├── sockets.js     # Real-time event handlers
│   ├── repository.js  # SQLite CRUD/transactions
│   ├── db.js          # better-sqlite3 connection + schema
│   └── csv.js         # CSV export builder
├── client/            # Vite + React frontend
│   ├── src/
│   │   ├── pages/         # HomePage, BoardPage
│   │   ├── components/    # Column, Card, NamePrompt
│   │   ├── hooks/         # useBoardState (reducer-based)
│   │   ├── api.js, socket.js, session.js
│   │   └── main.jsx, App.jsx, styles.css
│   └── vite.config.js
├── docs/              # Detailed API + frontend docs
├── Dockerfile
└── package.json
```

## How it works

1. The user opens the home page and creates a board.
2. The board is seeded with three default columns: "Went Well",
   "Needs Improvement", and "Action Items". Extra columns can be added.
3. On opening a board, the user is prompted for a display name (stored in
   `sessionStorage`).
4. The client opens a Socket.io connection and joins the room `board:<id>`.
   The initial board state is delivered as part of the `join_board`
   acknowledgement.
5. Card adds/moves/comments fire socket events. The server is the source of
   truth: it writes to SQLite, then broadcasts to everyone in the room.
6. The "Export to CSV" button on the board page downloads a CSV snapshot
   from `/api/boards/:id/export`.

## Documentation

- [docs/api.md](docs/api.md) — REST + Socket.io reference
- [docs/frontend.md](docs/frontend.md) — frontend architecture

## License

MIT
