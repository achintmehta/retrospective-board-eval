# RetroBoard

A real-time, self-hosted retrospective board built with Node.js, React, Socket.io, and SQLite.

## Features

- **Real-time collaboration** — Cards, moves, and comments sync instantly across all connected clients via WebSockets
- **Guest authentication** — Enter a display name to join any board, no account needed
- **Configurable columns** — Add custom columns to any board beyond the defaults
- **Drag-and-drop** — Move cards between columns with smooth drag-and-drop
- **Nested comments** — Click any card to view and add threaded comments
- **CSV Export** — Download a full board export as a CSV file
- **Single-container Docker** — Run the entire stack in one Docker container

## Quick Start

### Run locally (development)

```bash
# Install all dependencies
npm install
npm install --prefix client

# Start both backend and frontend
npm run dev
```

- Backend API: http://localhost:3001
- Frontend (Vite dev server): http://localhost:5173

Open **http://localhost:5173** in your browser.

### Run with Docker

```bash
# Build the image
docker build -t retroboard .

# Run the container (persists data via volume)
docker run -p 3001:3001 -v retroboard-data:/app/data retroboard
```

Open **http://localhost:3001** in your browser.

## Project Structure

```
├── server.js          # Express server + Socket.io event handlers
├── db.js              # SQLite (sql.js) database layer
├── package.json       # Backend dependencies and npm scripts
├── Dockerfile         # Single-container Docker build
└── client/            # React + Vite frontend
    ├── src/
    │   ├── App.jsx            # Router setup
    │   ├── index.css          # Global design system
    │   └── pages/
    │       ├── MainPage.jsx   # Board list & creation
    │       ├── MainPage.css
    │       ├── BoardPage.jsx  # Real-time board view
    │       └── BoardPage.css
    ├── index.html
    └── vite.config.js         # Dev proxy config
```

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend concurrently |
| `npm start` | Start backend only (production) |
| `npm run install:all` | Install all dependencies (backend + frontend) |

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Real-time | Socket.io v4 |
| Drag & Drop | @hello-pangea/dnd |
| Backend | Node.js + Express |
| Database | SQLite via sql.js |
| Styling | Vanilla CSS (dark glassmorphism theme) |
