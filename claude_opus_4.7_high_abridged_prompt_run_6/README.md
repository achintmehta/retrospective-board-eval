# Reflect — Realtime Retro Board

A self-hosted, real-time retrospective board. React + Vite frontend, Node.js/Express + Socket.io backend, SQLite storage. Runs locally with a single `npm run dev`, or ships as a single Docker container.

## Features

- **Guest sessions** — enter a display name, no accounts.
- **Boards with configurable columns** — every new board starts with *Went Well / Needs Improvement / Action Items*, and you can add more.
- **Real-time cards** — add, drag-and-drop between columns, and everyone sees the changes instantly over WebSockets.
- **Nested comments** — reply to any card; comments broadcast live.
- **CSV export** — one click to download the full board as CSV.
- **SQLite in a single file** — mount a volume in Docker and your data persists across restarts.

## Requirements

- **Node.js 22.5+** (the app uses Node's built-in `node:sqlite`, no native compilation, no C++ toolchain required).
- npm 10+.

## Running locally

```bash
npm install
npm --prefix client install
npm run dev
```

- Backend runs on `http://localhost:4000`
- Vite dev server runs on `http://localhost:5173` and proxies `/api` + `/socket.io` to the backend

Open `http://localhost:5173` in your browser.

The SQLite database file is created at `./data/retro.sqlite` (override with `DATA_DIR`).

## Production build

```bash
npm --prefix client install
npm install
npm run build
npm start
```

The backend now serves the compiled React app from the same origin at `http://localhost:4000`. Point users there.

## Docker

```bash
docker build -t reflect .
docker run -p 4000:4000 -v $(pwd)/data:/data reflect
```

The container hosts both the API and the static client on port `4000`, and persists SQLite to `/data`.

## Configuration

| Env var    | Default            | Purpose                          |
| ---------- | ------------------ | -------------------------------- |
| `PORT`     | `4000`             | HTTP server port.                |
| `DATA_DIR` | `./data`           | Directory holding `retro.sqlite`. |

## Documentation

- [`docs/API.md`](docs/API.md) — REST + Socket.io reference.
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — client architecture.

## Scripts

| Script            | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Run backend (tsx watch) and Vite in parallel. |
| `npm run build`   | Build client to `client/dist` and compile server to `dist`. |
| `npm start`       | Run the compiled production server.           |
| `npm run typecheck` | Type-check backend and client.              |

## License

Provided under the license already present in the workspace root.
