# Retro Board — Real-time Retrospective Board

A self-hosted, real-time retrospective board for team collaboration. Built with Node.js, Express, React, Socket.io, and SQLite.

## Features

- **Real-time collaboration** — cards, comments, and movements sync instantly across all connected clients via WebSockets
- **Drag and drop** — move cards between columns with smooth drag-and-drop
- **Guest authentication** — join boards with just a display name, no sign-up needed
- **CSV export** — export board data for archival or reporting
- **Single container** — deploy as a single Docker image with embedded SQLite

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Local Development

```bash
# Install all dependencies
npm run install:all

# Start the backend server
npm run dev

# In another terminal, start the frontend dev server
cd client && npm run dev
```

The frontend dev server (Vite) proxies API and WebSocket requests to the backend on port 3000.

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Docker

```bash
# Build
docker build -t retro-board .

# Run (with data persistence)
docker run -p 3000:3000 -v retro-data:/app/retro.sqlite retro-board
```

Access at http://localhost:3000.

## Usage

1. Open the app and create a new board by entering a title
2. Share the board URL with your team
3. Each team member enters their display name to join
4. Add columns (e.g., "Went Well", "Needs Improvement", "Action Items")
5. Add cards, drag them between columns, and comment on them
6. Export the board to CSV when done

## Project Structure

```
├── server/             # Express backend
│   ├── index.js        # Server entry point
│   ├── db.js           # SQLite schema and queries
│   ├── routes.js       # REST API endpoints
│   └── socket.js       # Socket.io event handlers
├── client/             # React frontend (Vite)
│   └── src/
│       ├── main.jsx
│       ├── index.css
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   └── BoardPage.jsx
│       └── components/
│           ├── GuestModal.jsx
│           └── CardItem.jsx
├── Dockerfile
└── package.json
```
