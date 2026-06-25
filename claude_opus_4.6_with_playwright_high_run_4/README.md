# Retrospective Board

A real-time retrospective board application for team retrospectives. Built with Node.js, Express, Socket.io, React, and SQLite.

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement", "Action Items")
- Real-time card creation, movement, and commenting via WebSockets
- Drag-and-drop cards between columns
- Guest authentication with display names
- Export board data to CSV
- Single-container Docker deployment

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts the backend on `http://localhost:3001` and the frontend dev server on `http://localhost:5173`.

### Production

```bash
npm run start
```

Builds the frontend and starts the server on `http://localhost:3001`.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

Access at `http://localhost:3001`. The `-v` flag persists the SQLite database across container restarts.

## API Documentation

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all boards |
| POST | `/api/boards` | Create a board. Body: `{ "title": "Sprint 1 Retro" }` |
| GET | `/api/boards/:id` | Get board with columns, cards, and comments |
| POST | `/api/boards/:id/columns` | Add a column. Body: `{ "title": "Went Well" }` |
| GET | `/api/boards/:id/export` | Export board as CSV download |

### WebSocket Events

Connect via Socket.io to the server.

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` (number) | Join a board room for real-time updates |
| `add_card` | `{ column_id, content, author_name }` | Add a card to a column |
| `move_card` | `{ card_id, target_column_id, position }` | Move a card between columns |
| `add_comment` | `{ card_id, content, author_name }` | Add a comment to a card |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | Card object with `comments: []` | Broadcasted when a card is added |
| `card_moved` | `{ card_id, target_column_id, position }` | Broadcasted when a card is moved |
| `comment_added` | Comment object with `card_id` | Broadcasted when a comment is added |

## Frontend

The frontend is a React SPA built with Vite. Key pages:

- **Main Page** (`/`): Lists all boards with a create form
- **Board Page** (`/boards/:id`): Shows columns, cards, and supports drag-and-drop, commenting, and CSV export

Guest authentication prompts users for a display name stored in session storage.

## Tech Stack

- **Backend**: Node.js, Express, Socket.io, better-sqlite3
- **Frontend**: React, Vite, @hello-pangea/dnd, socket.io-client, react-router-dom
- **Database**: SQLite (WAL mode)
