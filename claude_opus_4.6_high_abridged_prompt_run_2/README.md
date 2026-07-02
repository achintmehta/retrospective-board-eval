# Retro Board

A real-time retrospective board for team collaboration. Create boards, add cards, drag-and-drop between columns, comment on cards, and export to CSV — all synchronized instantly across connected clients via WebSockets.

## Quick Start

### Prerequisites

- Node.js 18+

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts the backend on `http://localhost:3001` and the frontend on `http://localhost:5173`.

### Production / Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

Access at `http://localhost:3001`. Board data persists via the mounted volume.

## Features

- **Board management** — create boards, configure columns (e.g. "Went Well", "Needs Improvement")
- **Real-time collaboration** — cards and comments sync instantly across all connected clients
- **Drag-and-drop** — move cards between columns with smooth drag-and-drop
- **Guest sessions** — join a board with just a display name, no signup required
- **Comments** — add threaded comments to cards
- **CSV export** — export board data for offline analysis

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, @hello-pangea/dnd |
| Backend | Node.js, Express |
| Real-time | Socket.io |
| Database | SQLite (via sql.js) |

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

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` | Join a board room |
| `add_card` | `{ columnId, content, authorName }` | Add a card |
| `move_card` | `{ cardId, targetColumnId, position }` | Move a card |
| `add_comment` | `{ cardId, content, authorName }` | Add a comment |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ columnId, card }` | A card was added |
| `card_moved` | `{ cardId, targetColumnId, position }` | A card was moved |
| `comment_added` | `{ cardId, comment }` | A comment was added |

## Frontend Structure

```
client/src/
├── main.jsx          # Entry point, router setup
├── App.jsx           # Route definitions
├── index.css         # Global styles, design tokens
├── pages/
│   ├── HomePage.jsx  # Board list + create form
│   └── BoardPage.jsx # Board view with real-time sync
└── components/
    ├── GuestModal.jsx   # Display name prompt
    ├── Column.jsx       # Droppable column with cards
    └── CardDetail.jsx   # Card detail modal with comments
```
