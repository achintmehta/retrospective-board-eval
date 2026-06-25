# RetroBoard

A real-time collaborative retrospective board. Create boards, add columns (e.g. "Went Well", "Needs Improvement"), write cards, drag them between columns, and leave comments — all synced live across every connected browser via WebSockets.

## Stack

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: React + Vite + @hello-pangea/dnd (drag-and-drop)
- **Database**: SQLite (via `better-sqlite3`, WAL mode)
- **Containerization**: Single Dockerfile

## Quick Start (Local)

```bash
# 1. Install backend dependencies
npm install

# 2. Install frontend dependencies
cd client && npm install && cd ..

# 3. Run both servers concurrently
npm run dev
```

The backend runs on **http://localhost:3001** and the Vite dev server on **http://localhost:5173** (proxying `/api` and `/socket.io` to the backend automatically).

## Production / Docker

```bash
# Build and run a single self-contained container
docker build -t retroboard .
docker run -p 3001:3001 retroboard
```

Open **http://localhost:3001** in your browser.

To persist the SQLite database across restarts, mount a volume:

```bash
docker run -p 3001:3001 -v $(pwd)/data:/app/data -e DB_PATH=/app/data/retro.sqlite retroboard
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP server port |
| `DB_PATH` | `./retro.sqlite` | Path to SQLite database file |
| `NODE_ENV` | — | Set to `production` to serve built frontend |

## Usage

1. Navigate to the app and click **Create Board**.
2. Open the board URL in multiple browser tabs to test real-time sync.
3. When prompted, enter a display name to identify yourself.
4. Add columns (e.g. "Went Well", "Needs Improvement", "Action Items").
5. Add cards to columns, drag them between columns, and click any card to view/add comments.
6. Click **Export CSV** in the board header to download all board data.
