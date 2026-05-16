# Retro Board

A real-time retrospective board for team collaboration. Create boards, add cards, drag-and-drop between columns, and comment — all synchronized instantly across connected clients via WebSockets.

## Quick Start

```bash
npm install
npm run dev
```

The application starts on `http://localhost:3000`. In development, run the Vite dev server separately for hot reload:

```bash
cd client && npm run dev
```

Then open `http://localhost:5173`.

## Docker

```bash
docker build -t retro-board .
docker run -p 3000:3000 -v retro-data:/app retro-board
```

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement", "Action Items")
- Real-time card creation, drag-and-drop movement, and commenting via Socket.io
- Guest authentication with display name (session-based)
- Export board data to CSV
- Dark-themed, premium UI with glassmorphism and micro-animations

## Tech Stack

- **Backend:** Node.js, Express 5, Socket.io, better-sqlite3
- **Frontend:** React 19, Vite, @hello-pangea/dnd, socket.io-client
- **Database:** SQLite (WAL mode)
- **Deployment:** Single Docker container

## Project Structure

```
├── server/
│   ├── index.js      # Express + Socket.io server
│   ├── db.js         # SQLite schema and queries
│   ├── routes.js     # REST API endpoints
│   └── socket.js     # WebSocket event handlers
├── client/
│   └── src/
│       ├── App.jsx           # Router setup
│       ├── pages/
│       │   ├── HomePage.jsx  # Board list and creation
│       │   └── BoardPage.jsx # Board with columns, cards, DnD
│       └── components/
│           ├── GuestAuthModal.jsx
│           └── CommentModal.jsx
├── Dockerfile
└── package.json
```
