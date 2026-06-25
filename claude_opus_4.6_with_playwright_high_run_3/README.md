# Retro Board

A real-time retrospective board application for teams. Built with Node.js, Express, React, Socket.io, and SQLite.

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement")
- Real-time card creation and movement via WebSockets
- Drag-and-drop cards between columns
- Nested comments on cards
- Guest authentication with display names
- Export board data to CSV
- Single-container Docker deployment

## Quick Start

### Prerequisites

- Node.js 18+

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts both the backend (port 3001) and frontend dev server (port 5173).

Open http://localhost:5173.

### Production

```bash
npm start
```

Builds the frontend and serves everything from port 3001.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/data retro-board
```

Open http://localhost:3001.

## API

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all boards |
| POST | `/api/boards` | Create a board (`{ "title": "..." }`) |
| GET | `/api/boards/:id` | Get board with columns, cards, and comments |
| POST | `/api/boards/:id/columns` | Add a column (`{ "title": "..." }`) |
| GET | `/api/boards/:id/export` | Download board as CSV |

### WebSocket Events

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` | Join a board room |
| `add_card` | `{ boardId, columnId, content, authorName }` | Add a card |
| `move_card` | `{ boardId, cardId, targetColumnId, targetPosition }` | Move a card |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | Card object | A card was added |
| `card_moved` | `{ cardId, targetColumnId, targetPosition }` | A card was moved |
| `comment_added` | `{ cardId, comment }` | A comment was added |

## Frontend

The frontend is a React SPA built with Vite, using:

- **React Router** for navigation between the board list and individual boards
- **Socket.io Client** for real-time updates
- **@hello-pangea/dnd** for drag-and-drop card movement

### Pages

- `/` — Main page with board list and creation form
- `/board/:id` — Board page with columns, cards, drag-and-drop, and comments

### Guest Authentication

When visiting a board, users are prompted to enter a display name stored in `sessionStorage`. This name is attached to cards and comments they create.
