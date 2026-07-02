# Retro Board

A real-time retrospective board for team collaboration. Built with React, Express, Socket.io, and SQLite.

## Features

- **Real-time collaboration** — cards, moves, and comments sync instantly across all connected clients via WebSockets
- **Drag and drop** — move cards between columns with smooth drag-and-drop
- **Guest sessions** — join with just a display name, no sign-up required
- **CSV export** — download all board data as a CSV file
- **Single-container deployment** — runs as a single Docker image with embedded SQLite

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts the backend on `http://localhost:3001` and the frontend dev server on `http://localhost:5173`.

### Production

```bash
npm start
```

Builds the frontend and starts the server at `http://localhost:3001`.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app retro-board
```

Access at `http://localhost:3001`.

## API Reference

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/boards` | List all boards |
| `POST` | `/api/boards` | Create a new board |
| `GET` | `/api/boards/:id` | Get board with columns, cards, and comments |
| `POST` | `/api/boards/:id/columns` | Add a column to a board |
| `GET` | `/api/boards/:id/export` | Export board data as CSV |

### Create Board

```
POST /api/boards
Content-Type: application/json

{
  "title": "Sprint 42 Retro",
  "columns": ["Went Well", "Needs Improvement", "Action Items"]  // optional, defaults provided
}
```

### Add Column

```
POST /api/boards/:id/columns
Content-Type: application/json

{ "title": "New Column" }
```

### WebSocket Events

Connect via Socket.io and join a board room:

| Event (Client → Server) | Payload | Broadcast (Server → All) |
|--------------------------|---------|--------------------------|
| `join_board` | `boardId` | — |
| `add_card` | `{ boardId, columnId, content, authorName }` | `card_added` |
| `move_card` | `{ boardId, cardId, newColumnId, newPosition }` | `card_moved` |
| `add_comment` | `{ boardId, cardId, content, authorName }` | `comment_added` |

## Frontend Architecture

The frontend is a React SPA built with Vite:

- **`MainPage`** — lists all boards with a form to create new ones
- **`BoardPage`** — the main board view with columns, cards, drag-and-drop, and real-time updates
- **`GuestModal`** — prompts for a display name when joining a board
- **`CardItem`** — individual card with color accent and comment count
- **`CommentPanel`** — slide-out panel for viewing and adding comments to a card

State is managed locally and synchronized via Socket.io events. The server is the single source of truth — all mutations go through the server, which persists to SQLite and broadcasts to all clients in the board room.

## Tech Stack

- **Frontend:** React 19, Vite, React Router, @hello-pangea/dnd, Socket.io Client
- **Backend:** Node.js, Express, Socket.io, better-sqlite3
- **Styling:** CSS Modules with custom dark theme
