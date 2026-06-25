# Retrospective Board

A real-time retrospective board application for team retrospectives. Built with Node.js, Express, React, Socket.io, and SQLite.

## Features

- Create and manage retrospective boards
- Configurable columns per board (e.g., "Went Well", "Needs Improvement")
- Real-time card creation and movement via WebSockets
- Drag-and-drop cards between columns
- Nested comments on cards
- Guest authentication via display name
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

This starts both the backend (port 3000) and frontend dev server (port 5173) with hot reload.

Open http://localhost:5173 in your browser.

### Production

```bash
npm run build
npm start
```

The application serves at http://localhost:3000.

### Docker

```bash
docker build -t retro-board .
docker run -p 3000:3000 -v retro-data:/app/data retro-board
```

Mount `/app/data` as a volume to persist the SQLite database across restarts.

## API Documentation

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/boards` | List all boards |
| `POST` | `/api/boards` | Create a board. Body: `{ "title": "..." }` |
| `GET` | `/api/boards/:id` | Get a board with columns, cards, and comments |
| `POST` | `/api/boards/:id/columns` | Add a column. Body: `{ "title": "..." }` |
| `GET` | `/api/boards/:id/export` | Export board data as CSV |

### WebSocket Events

Connect via Socket.io to the server.

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` | Join a board room |
| `leave_board` | `boardId` | Leave a board room |
| `add_card` | `{ columnId, content, authorName, boardId }` | Add a card |
| `move_card` | `{ cardId, targetColumnId, targetPosition, boardId }` | Move a card |
| `add_comment` | `{ cardId, content, authorName, boardId }` | Add a comment |
| `add_column` | `{ boardId, title }` | Add a column |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ columnId, card }` | A card was added |
| `card_moved` | `{ cardId, targetColumnId, targetPosition, card }` | A card was moved |
| `comment_added` | `{ cardId, comment }` | A comment was added |
| `column_added` | `{ column }` | A column was added |

## Frontend

The frontend is a React single-page application built with Vite.

**Pages:**
- **Main Page** (`/`): Lists all boards with a form to create new ones
- **Board Page** (`/boards/:id`): The interactive board with columns, cards, drag-and-drop, comments, and export

**Key Libraries:**
- `react-router-dom` — Client-side routing
- `socket.io-client` — Real-time communication
- `@hello-pangea/dnd` — Drag-and-drop

## Data Model

```
Board (id, title, created_at)
  └─ BoardColumn (id, board_id, title, position)
       └─ Card (id, column_id, content, author_name, created_at, position)
            └─ Comment (id, card_id, content, author_name, created_at)
```

SQLite database is stored at `data/retro.sqlite`.
