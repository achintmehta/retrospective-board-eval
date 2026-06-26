# RetroBoard

A real-time retrospective board for team collaboration. Create boards, add cards, drag-and-drop between columns, and comment — all synchronized instantly across connected clients via WebSockets.

## Features

- Create and manage retrospective boards with custom columns
- Add cards to columns and move them via drag-and-drop
- Nested comments on cards
- Real-time synchronization across all connected clients (Socket.io)
- Guest-based sessions — just enter a display name
- Export board data to CSV
- SQLite storage — zero external database setup
- Single Docker container deployment

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

The app starts at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

Open http://localhost:3001.

## API Documentation

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/boards` | List all boards |
| `POST` | `/api/boards` | Create a board (`{ "title": "..." }`) |
| `GET` | `/api/boards/:id` | Get board with columns, cards, and comments |
| `POST` | `/api/boards/:id/columns` | Add a column (`{ "title": "..." }`) |
| `GET` | `/api/boards/:id/export` | Download board as CSV |

### WebSocket Events

Connect via Socket.io to the server.

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` | Join a board room |
| `add_card` | `{ columnId, content, authorName, boardId }` | Add a card |
| `move_card` | `{ cardId, newColumnId, newPosition, boardId }` | Move a card |
| `add_comment` | `{ cardId, content, authorName, boardId }` | Add a comment |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ columnId, card }` | A card was added |
| `card_moved` | `{ card, newColumnId, newPosition }` | A card was moved |
| `comment_added` | `{ cardId, comment }` | A comment was added |
| `column_added` | `column` | A column was added |

## Frontend Architecture

Built with React (Vite) using:

- **React Router** — Client-side routing (`/` for home, `/board/:id` for boards)
- **Socket.io Client** — Real-time event handling
- **@hello-pangea/dnd** — Drag-and-drop card movement

### Pages

- **HomePage** — Lists boards, create new boards
- **BoardPage** — Main collaboration view with columns, cards, drag-and-drop, and comments

### Components

- **GuestModal** — Display name prompt on first board visit
- **CardItem** — Individual card with content, author, and comment count
- **AddCardForm** — Expandable card creation form per column
- **CommentPanel** — Slide-out panel for viewing/adding comments on a card

## Data Model

```
Board (id, title, created_at)
  └── BoardColumn (id, board_id, title, position)
       └── Card (id, column_id, content, author_name, created_at, position)
            └── Comment (id, card_id, content, author_name, created_at)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Real-Time | Socket.io |
| Database | SQLite (better-sqlite3) |
| Drag & Drop | @hello-pangea/dnd |
