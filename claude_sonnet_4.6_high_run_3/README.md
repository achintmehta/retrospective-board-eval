# Retrospective Board

A real-time retrospective board built with Node.js, Express, Socket.io, React, and SQLite.

## Prerequisites

- Node.js 22 or later (uses built-in `node:sqlite`)
- npm

## Running Locally

### 1. Install dependencies

```bash
# Backend
npm install

# Frontend
npm install --prefix client
```

### 2. Start development servers

```bash
npm run dev
```

This starts both:
- Backend API + WebSocket server on `http://localhost:3001`
- Vite dev server on `http://localhost:5173` (with API proxy)

Open `http://localhost:5173` in your browser.

### 3. (Optional) Production build

```bash
npm run build
npm start
```

In production mode the Express server also serves the built frontend. Open `http://localhost:3001`.

## Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

The `-v retro-data:/app/data` flag persists the SQLite database across container restarts.

Open `http://localhost:3001`.

## Usage

1. **Create a board** — Enter a board name on the home page and click "Create Board".
   Three default columns are created: *Went Well*, *Needs Improvement*, *Action Items*.
2. **Join a board** — Navigate to any board URL. Enter a display name when prompted.
3. **Add cards** — Click "+ Add a card" below any column and submit.
4. **Move cards** — Drag and drop cards between columns.
5. **Comment on cards** — Click "Comments" on a card to expand the comment thread.
6. **Add columns** — Click "+ Add a column" at the end of the board.
7. **Export** — Click "Export CSV" in the header to download all board data.

All actions are broadcast in real time to all connected users in the same board.
