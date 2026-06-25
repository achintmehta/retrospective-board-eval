# RetroBoard — Real-time Retrospective Board

A self-hosted, real-time collaborative retrospective board for agile teams. No sign-up required.

## Features

- **Real-time collaboration** — Cards, moves, and comments broadcast instantly to all connected clients via WebSockets (Socket.io)
- **Guest sessions** — Enter a display name to join; no account needed
- **Drag & drop** — Move cards between columns using drag-and-drop
- **Nested comments** — Add threaded comments to any card
- **CSV export** — Export a full board snapshot to a CSV file
- **Persistent storage** — SQLite database; data survives restarts
- **Single container** — Ships as one Docker image with no external dependencies

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Database | SQLite (via better-sqlite3) |
| Frontend | React + Vite |
| Drag & Drop | @hello-pangea/dnd |

## Running Locally

### Prerequisites
- Node.js 18+
- npm 8+

### Steps

```bash
# 1. Install backend dependencies
npm install

# 2. Install frontend dependencies
npm install --prefix client

# 3. Start both servers concurrently
npm run dev
```

The app will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

## Running with Docker

```bash
# Build the image
docker build -t retroboard .

# Run (data persists in a Docker volume)
docker run -p 3001:3001 -v retroboard-data:/app/data retroboard
```

The app will be available at http://localhost:3001.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `DB_PATH` | `./retro.sqlite` | Path to the SQLite database file |
| `NODE_ENV` | — | Set to `production` to serve static frontend |

## Project Structure

```
.
├── server.js          # Express + Socket.io server
├── db.js              # SQLite setup and query helpers
├── package.json       # Backend scripts and deps
├── Dockerfile
├── docs/
│   ├── api.md         # REST API reference
│   └── frontend.md    # Frontend architecture
└── client/            # Vite + React frontend
    ├── src/
    │   ├── App.jsx
    │   ├── pages/
    │   │   ├── MainPage.jsx
    │   │   └── BoardPage.jsx
    │   └── components/
    │       ├── Column.jsx
    │       ├── Card.jsx
    │       └── GuestAuthModal.jsx
    └── vite.config.js
```
