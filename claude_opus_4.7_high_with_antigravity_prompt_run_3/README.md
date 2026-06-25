# Prism Retro

A self-hosted, real-time retrospective board. Multiple teammates can join a
board with just a display name, drag cards between columns, comment on cards,
and watch every change sync instantly. No accounts, no SaaS, no setup.

- **Backend:** Node.js + Express + Socket.io
- **Frontend:** React (Vite) with `@dnd-kit` for drag-and-drop
- **Storage:** SQLite via Node's built-in `node:sqlite` (no native compilation)
- **Deployment:** Single Docker container, or `npm run dev` locally

## Requirements

- Node.js **22.5+** (for the built-in `node:sqlite` module). Tested on Node 24.

## Quick start (development)

```bash
npm run install:all   # installs server + client deps
npm run dev           # starts server (3001) and Vite dev server (5173)
```

Then open `http://localhost:5173`. Vite proxies `/api` and `/socket.io` to the
backend on port 3001 — you only need to remember one URL.

## Production build

```bash
npm run build         # builds the React app to client/dist
npm start             # serves API + WebSockets + static client on PORT (default 3001)
```

Once built, open `http://localhost:3001`.

## Docker

```bash
docker build -t prism-retro .
docker run --rm -p 3001:3001 -v $(pwd)/data:/app/data prism-retro
```

The bind-mounted `data/` directory keeps the SQLite database between container
restarts.

## Environment variables

| Variable  | Default                  | Description                                |
| --------- | ------------------------ | ------------------------------------------ |
| `PORT`    | `3001`                   | HTTP + WebSocket port                      |
| `DB_PATH` | `./data/retro.sqlite`    | Path to the SQLite file                    |

## How it works

1. Visit the main page and create a board. It is seeded with three default
   columns — *Went Well*, *To Improve*, *Action Items*.
2. Share the board URL with your team.
3. Each teammate enters a display name in the join modal — that name is the
   author label on their cards and comments.
4. Add cards, drag them between columns, and open any card to discuss it in
   nested comments. Everything is broadcast to every connected client live.
5. When you are done, click **Export CSV** to download a complete record.

## Documentation

- [`docs/api.md`](docs/api.md) — REST + Socket.io contract
- [`docs/frontend.md`](docs/frontend.md) — frontend architecture

## Project layout

```
.
├── server/                 # Express + Socket.io backend
│   ├── index.js            # HTTP server entry
│   ├── api.js              # REST routes
│   ├── realtime.js         # Socket.io event handlers
│   ├── db.js               # node:sqlite setup + schema
│   └── repository.js       # Pure data-access helpers
├── client/                 # Vite + React frontend
│   ├── src/
│   │   ├── pages/          # MainPage, BoardPage
│   │   ├── components/     # Column, Card, GuestAuthModal
│   │   ├── api.js          # REST client
│   │   ├── socket.js       # Socket.io client singleton
│   │   └── index.css       # Design system
│   └── vite.config.js
├── Dockerfile
└── package.json
```
