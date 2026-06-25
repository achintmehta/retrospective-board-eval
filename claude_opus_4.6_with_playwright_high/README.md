# Retrospective Board

A real-time retrospective board for team retrospectives. Supports multiple users, drag-and-drop card management, nested comments, and CSV export.

## Quick Start

### Prerequisites

- Node.js 18+

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

The backend runs on `http://localhost:3001` and the frontend on `http://localhost:5173`.

### Production

```bash
npm run build
npm start
```

The app serves on `http://localhost:3001`.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/data retro-board
```

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement")
- Add cards to columns with drag-and-drop reordering
- Nested comments on cards
- Real-time sync across all connected clients via WebSocket
- Guest authentication via display name
- Export board data to CSV

## API

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all boards |
| POST | `/api/boards` | Create a board (`{ "title": "..." }`) |
| GET | `/api/boards/:id` | Get board with columns, cards, and comments |
| POST | `/api/boards/:id/columns` | Add a column (`{ "title": "..." }`) |
| GET | `/api/boards/:id/export` | Export board as CSV |

### WebSocket Events

**Client -> Server:**
| Event | Payload |
|-------|---------|
| `join_board` | `boardId` |
| `add_card` | `{ columnId, content, authorName, boardId }` |
| `move_card` | `{ cardId, sourceColumnId, targetColumnId, targetPosition, boardId }` |
| `add_comment` | `{ cardId, columnId, content, authorName, boardId }` |

**Server -> Client:**
| Event | Payload |
|-------|---------|
| `card_added` | `{ columnId, card }` |
| `card_moved` | `{ cardId, sourceColumnId, targetColumnId, targetPosition, card }` |
| `comment_added` | `{ cardId, columnId, comment }` |

## Frontend

Built with React + Vite. Key pages:

- **Main Page** (`/`): Lists all boards, create new boards
- **Board Page** (`/board/:id`): Interactive board with columns, cards, drag-and-drop, comments, and export

### Tech Stack

- React with Vite
- React Router for navigation
- Socket.io client for real-time updates
- @hello-pangea/dnd for drag-and-drop
- Express + Socket.io backend
- SQLite (better-sqlite3) for storage
