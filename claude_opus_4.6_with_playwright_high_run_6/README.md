# Retrospective Board

A real-time retrospective board application for team retrospectives. Supports multiple users collaborating simultaneously via WebSockets.

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement")
- Real-time card creation and movement via drag-and-drop
- Nested comments on cards
- Guest session authentication (display name)
- Export board data to CSV
- SQLite storage (zero-config, single file)

## Quick Start

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

The app runs at `http://localhost:5173` (frontend) with the API on port 3001.

## Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app retro-board
```

Access the app at `http://localhost:3001`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all boards |
| POST | `/api/boards` | Create a board (`{ "title": "..." }`) |
| GET | `/api/boards/:id` | Get board with columns, cards, comments |
| POST | `/api/boards/:id/columns` | Add a column (`{ "title": "..." }`) |
| GET | `/api/boards/:id/export` | Export board as CSV |

## WebSocket Events

**Client -> Server:**
- `join_board` / `leave_board` - Join/leave a board room
- `add_card` - `{ boardId, columnId, content, authorName }`
- `move_card` - `{ boardId, cardId, targetColumnId, targetPosition }`
- `add_comment` - `{ boardId, cardId, content, authorName }`
- `add_column` - `{ boardId, title }`

**Server -> Client:**
- `card_added` - `{ columnId, card }`
- `card_moved` - `{ cardId, targetColumnId, targetPosition }`
- `comment_added` - `{ cardId, comment }`
- `column_added` - `{ column }`

## Tech Stack

- **Backend:** Node.js, Express, Socket.io, better-sqlite3
- **Frontend:** React (Vite), react-router-dom, socket.io-client, @hello-pangea/dnd
