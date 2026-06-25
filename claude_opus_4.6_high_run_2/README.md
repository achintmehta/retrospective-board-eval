# Retrospective Board

A real-time retrospective board application for team retrospectives. Built with Node.js, Express, React, Socket.io, and SQLite.

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement", "Action Items")
- Real-time card creation and drag-and-drop between columns
- Nested comments on cards
- Guest authentication via display name
- Export board data to CSV
- Single-container Docker deployment

## Quick Start

### Prerequisites

- Node.js 18+

### Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Run both backend and frontend
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173

### Production (Docker)

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

Access the application at http://localhost:3001.

## API Documentation

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/boards` | List all boards |
| `POST` | `/api/boards` | Create a new board |
| `GET` | `/api/boards/:id` | Get board with columns, cards, and comments |
| `POST` | `/api/boards/:id/columns` | Add a column to a board |
| `GET` | `/api/boards/:id/export` | Export board data as CSV |

#### POST /api/boards

Request body:
```json
{ "title": "Sprint 42 Retro" }
```

Response: `201 Created`
```json
{ "id": 1, "title": "Sprint 42 Retro" }
```

#### POST /api/boards/:id/columns

Request body:
```json
{ "title": "Went Well" }
```

Response: `201 Created`
```json
{ "id": 1, "board_id": 1, "title": "Went Well", "position": 0 }
```

### WebSocket Events

Connect via Socket.io to `http://localhost:3001`.

| Event (Client -> Server) | Payload | Description |
|--------------------------|---------|-------------|
| `join_board` | `boardId` | Join a board room |
| `add_card` | `{ boardId, columnId, content, authorName }` | Add a card |
| `move_card` | `{ boardId, cardId, newColumnId, newPosition }` | Move a card |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment |

| Event (Server -> Client) | Payload | Description |
|--------------------------|---------|-------------|
| `card_added` | Card object | A card was added |
| `card_moved` | `{ cardId, newColumnId, newPosition }` | A card was moved |
| `comment_added` | Comment object | A comment was added |

## Frontend Architecture

The frontend is a React SPA built with Vite:

- **MainPage** (`/`) - Lists all boards with a creation form
- **BoardPage** (`/board/:id`) - The retrospective board with columns, cards, drag-and-drop, and real-time sync
- **GuestAuthModal** - Prompts for a display name on first visit to a board
- **Column** / **Card** / **CommentsSection** - Board UI components

Real-time updates use Socket.io. Drag-and-drop is powered by `@hello-pangea/dnd`.

## Data Model

- **Board**: id, title, created_at
- **BoardColumn**: id, board_id, title, position
- **Card**: id, column_id, content, author_name, created_at, position
- **Comment**: id, card_id, content, author_name, created_at

SQLite with WAL mode is used for storage. The database file (`retro.sqlite`) is created automatically on first run.
