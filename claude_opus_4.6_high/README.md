# Retro Board

A real-time retrospective board application for team retrospectives. Features live collaboration via WebSockets, drag-and-drop card management, and CSV export.

## Quick Start

### Prerequisites

- Node.js 20+

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts both the backend (port 3001) and frontend dev server (port 5173). Open http://localhost:5173.

### Production

```bash
npm run build
npm start
```

The server serves the built frontend and API on port 3001.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/data retro-board
```

Open http://localhost:3001.

## Features

- Create and manage retrospective boards
- Add configurable columns (e.g., "Went Well", "Needs Improvement", "Action Items")
- Add cards to columns with your display name
- Drag and drop cards between columns
- Add comments/replies to cards
- Real-time sync across all connected users via WebSockets
- Export board data to CSV
- Guest authentication via display name

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

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` | Join a board room |
| `leave_board` | `boardId` | Leave a board room |
| `add_card` | `{ columnId, content, authorName, boardId }` | Add a card |
| `move_card` | `{ cardId, targetColumnId, targetPosition, boardId }` | Move a card |
| `add_comment` | `{ cardId, content, authorName, boardId }` | Add a comment |

**Server -> Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ columnId, card }` | A card was added |
| `card_moved` | `{ cardId, targetColumnId, card }` | A card was moved |
| `comment_added` | `{ cardId, comment }` | A comment was added |

## Frontend

Built with React + Vite. Key pages:

- **Home** (`/`): Lists boards, create new boards
- **Board** (`/board/:id`): Full board view with columns, cards, drag-and-drop, comments, and export

### Components

- `App` - Home page with board listing and creation
- `BoardPage` - Main board view with real-time sync
- `Column` - Droppable column with cards
- `CardModal` - Card detail view with comments
- `GuestModal` - Display name entry prompt

## Tech Stack

- **Backend**: Node.js, Express, Socket.io, better-sqlite3
- **Frontend**: React, Vite, react-router-dom, @hello-pangea/dnd, socket.io-client
- **Database**: SQLite (WAL mode)
